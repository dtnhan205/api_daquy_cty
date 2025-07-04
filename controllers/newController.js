const mongoose = require('mongoose');
const News = require('../models/news');
const validator = require('validator');
const multer = require('multer');
const upload = require('../middlewares/multerConfig');

// Hàm tạo slug từ title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
};

// Middleware xử lý lỗi upload
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Lỗi upload: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Lấy tất cả tin tức
exports.getAllNews = async (req, res) => {
  try {
    const newsList = await News.find().populate('newCategory').sort({ publishedAt: -1 });
    if (newsList.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tin tức nào" });
    }
    res.json(newsList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy tin tức', error: error.message });
  }
};

// Lấy tin tức theo slug
exports.getNewsById = async (req, res) => {
  try {
    const isAdmin = !!req.headers.authorization;

    let news;
    if (isAdmin) {
      news = await News.findOne({ slug: req.params.slug }).populate('newCategory');
    } else {
      news = await News.findOneAndUpdate(
        { slug: req.params.slug },
        { $inc: { views: 1 } },
        { new: true }
      ).populate('newCategory');
    }

    if (!news) {
      return res.status(404).json({ message: "Không tìm thấy tin tức" });
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy tin tức', error: error.message });
  }
};

// Lấy bài đăng hot nhất
exports.getHottestNews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 0;

    let query = News.find({ status: 'show' }).populate('newCategory').sort({ views: -1 });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const hottestNewsList = await query;

    if (hottestNewsList.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng nào' });
    }

    res.json({
      message: 'Lấy danh sách bài đăng hot thành công',
      news: hottestNewsList,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách bài đăng hot', error: error.message });
  }
};

// Tạo tin tức mới
exports.createNews = async (req, res) => {
  try {
    const {
      title,
      thumbnailCaption,
      publishedAt,
      views,
      status,
      contentBlocks: rawContentBlocks,
      newCategory,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(newCategory)) {
      return res.status(400).json({ error: 'newCategory không hợp lệ' });
    }

    const thumbnail = req.files && req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
    if (!thumbnail) {
      return res.status(400).json({ error: 'Không tìm thấy file thumbnail' });
    }
    const thumbnailUrl = `/images/${thumbnail.filename}`;

    const newId = new mongoose.Types.ObjectId().toString();
    const slug = generateSlug(title);

    let contentBlocks = [];
    if (rawContentBlocks) {
      if (typeof rawContentBlocks === 'string') {
        try {
          contentBlocks = JSON.parse(rawContentBlocks);
        } catch (e) {
          return res.status(400).json({ error: 'contentBlocks JSON không hợp lệ' });
        }
      } else if (Array.isArray(rawContentBlocks)) {
        contentBlocks = rawContentBlocks;
      }
    }

    if (!Array.isArray(contentBlocks)) {
      contentBlocks = [];
    }

    const uploadedImages = req.files && req.files['images'] ? req.files['images'] : [];
    const imageMap = new Map(uploadedImages.map((file, index) => [index, `/images/${file.filename}`]));

    let imageIndex = 0;
    const finalContentBlocks = contentBlocks.map(block => {
      if (!block.type) {
        if (block.url && block.url.trim()) {
          block.type = 'image';
        } else if (block.content && block.content.trim().includes('<li>')) {
          block.type = 'list';
        } else if (block.content && block.content.trim()) {
          block.type = 'text';
        } else {
          return null; // Bỏ qua nếu không xác định được
        }
      }
      if (block.type === 'image') {
        if (block.url && !block.url.startsWith('blob:') && !block.url.includes('placeholder')) {
          return block;
        }
        const url = imageMap.get(imageIndex);
        if (url) {
          imageIndex++;
          return {
            type: 'image',
            content: '',
            url: url,
            caption: block.caption || '',
          };
        }
        return null;
      }
      if (block.type === 'text' && !block.content) {
        return null;
      }
      if (block.type === 'list' && (!block.content || !block.content.trim())) {
        return null;
      }
      if (block.type === 'list') {
        const content = block.content.trim();
        if (!content.includes('<li>')) {
          return null;
        }
        return {
          type: 'list',
          content: content,
          url: '',
          caption: '',
        };
      }
      return block;
    }).filter(block => block !== null);

    while (imageIndex < uploadedImages.length) {
      const url = imageMap.get(imageIndex);
      if (url) {
        finalContentBlocks.push({
          type: 'image',
          content: '',
          url: url,
          caption: '',
        });
        imageIndex++;
      }
    }

    let parsedPublishedAt = new Date();
    if (publishedAt) {
      parsedPublishedAt = new Date(publishedAt);
      if (isNaN(parsedPublishedAt.getTime())) {
        return res.status(400).json({ error: 'publishedAt không phải là định dạng ngày hợp lệ' });
      }
    }

    const newNews = new News({
      id: newId,
      title,
      slug,
      thumbnailUrl,
      thumbnailCaption: thumbnailCaption || '',
      publishedAt: parsedPublishedAt,
      views: parseInt(views, 10) || 0,
      status: status || 'show',
      contentBlocks: finalContentBlocks,
      newCategory,
    });

    await newNews.save();
    const populatedNews = await News.findById(newNews._id).populate('newCategory');
    res.status(201).json({
      message: 'Tạo tin tức thành công',
      news: populatedNews,
    });
  } catch (err) {
    console.error('POST /api/news error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: `Slug đã tồn tại` });
    }
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật tin tức theo slug
exports.updateNews = async (req, res) => {
  const { slug } = req.params;
  const {
    title,
    thumbnailCaption,
    publishedAt,
    views,
    status,
    contentBlocks: rawContentBlocks,
    newCategory,
  } = req.body;

  try {
    if (newCategory && !mongoose.Types.ObjectId.isValid(newCategory)) {
      return res.status(400).json({ error: 'newCategory không hợp lệ' });
    }

    let contentBlocks = [];
    if (rawContentBlocks) {
      if (typeof rawContentBlocks === 'string') {
        try {
          contentBlocks = JSON.parse(rawContentBlocks);
        } catch (e) {
          return res.status(400).json({ error: 'contentBlocks JSON không hợp lệ' });
        }
      } else if (Array.isArray(rawContentBlocks)) {
        contentBlocks = rawContentBlocks;
      }
    }

    if (!Array.isArray(contentBlocks)) {
      contentBlocks = [];
    }

    const thumbnail = req.files && req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
    const uploadedImages = req.files && req.files['images'] ? req.files['images'] : [];
    const imageMap = new Map(uploadedImages.map((file, index) => [index, `/images/${file.filename}`]));

    let imageIndex = 0;
    const finalContentBlocks = contentBlocks.map(block => {
      if (!block.type) {
        if (block.url && block.url.trim()) {
          block.type = 'image';
        } else if (block.content && block.content.trim().includes('<li>')) {
          block.type = 'list';
        } else if (block.content && block.content.trim()) {
          block.type = 'text';
        } else {
          return null; // Bỏ qua nếu không xác định được
        }
      }
      if (block.type === 'image') {
        if (block.url && !block.url.startsWith('blob:') && !block.url.includes('placeholder')) {
          return block;
        }
        const url = imageMap.get(imageIndex);
        if (url) {
          imageIndex++;
          return {
            type: 'image',
            content: '',
            url: url,
            caption: block.caption || '',
          };
        }
        return null;
      }
      if (block.type === 'text' && (!block.content || typeof block.content !== 'string')) {
        return null;
      }
      if (block.type === 'list' && (!block.content || !block.content.trim())) {
        return null;
      }
      if (block.type === 'list') {
        const content = block.content.trim();
        if (!content.includes('<li>')) {
          return null;
        }
        return {
          type: 'list',
          content: content,
          url: '',
          caption: '',
        };
      }
      return block;
    }).filter(block => block !== null);

    while (imageIndex < uploadedImages.length) {
      const url = imageMap.get(imageIndex);
      if (url) {
        finalContentBlocks.push({
          type: 'image',
          content: '',
          url: url,
          caption: '',
        });
        imageIndex++;
      }
    }

    const finalThumbnailUrl = thumbnail ? `/images/${thumbnail.filename}` : undefined;

    let parsedPublishedAt = new Date();
    if (publishedAt) {
      parsedPublishedAt = new Date(publishedAt);
      if (isNaN(parsedPublishedAt.getTime())) {
        return res.status(400).json({ error: 'publishedAt không phải là định dạng ngày hợp lệ' });
      }
    }

    const updateData = {
      title,
      slug: title ? generateSlug(title) : undefined,
      thumbnailUrl: finalThumbnailUrl,
      thumbnailCaption: thumbnailCaption || '',
      publishedAt: parsedPublishedAt,
      views: parseInt(views, 10) || 0,
      status: status || 'show',
      contentBlocks: finalContentBlocks,
    };

    if (newCategory) {
      updateData.newCategory = newCategory;
    }

    const updatedNews = await News.findOneAndUpdate(
      { slug },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('newCategory');

    if (!updatedNews) return res.status(404).json({ error: 'Không tìm thấy tin tức để cập nhật' });

    res.json({
      message: 'Cập nhật tin tức thành công',
      news: updatedNews,
    });
  } catch (err) {
    console.error(`PUT /api/news/${slug} error:`, err);
    if (err.code === 11000) {
      return res.status(400).json({ error: `Slug đã tồn tại` });
    }
    res.status(400).json({ error: err.message });
  }
};

// Xóa tin tức theo slug
exports.deleteNews = async (req, res) => {
  const { slug } = req.params;

  try {
    const deletedNews = await News.findOneAndDelete({ slug });
    if (!deletedNews) {
      return res.status(404).json({ message: 'Không tìm thấy tin tức để xóa' });
    }
    res.json({ message: 'Xóa tin tức thành công' });
  } catch (err) {
    console.error(`DELETE /api/news/${slug} error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// Chuyển đổi trạng thái hiển thị của tin tức
exports.toggleNewsVisibility = async (req, res) => {
  const { slug } = req.params;

  try {
    const news = await News.findOne({ slug }).populate('newCategory');
    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy tin tức' });
    }

    news.status = news.status === 'show' ? 'hidden' : 'show';
    await news.save();

    const updatedNews = await News.findOne({ slug }).populate('newCategory');

    res.json({
      message: `Tin tức đã được ${updatedNews.status === 'show' ? 'hiển thị' : 'ẩn'}`,
      news: updatedNews,
    });
  } catch (err) {
    console.error(`PUT /api/news/${slug}/toggle-visibility error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

exports.uploadMiddleware = [upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'images', maxCount: 10 }]), handleMulterError];