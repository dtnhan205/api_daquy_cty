const mongoose = require('mongoose');
const News = require('../models/news');
const validator = require('validator');
const multer = require('multer');
const upload = require('../middlewares/multerConfig');

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
    const newsList = await News.find().sort({ publishedAt: -1 });
    if (newsList.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tin tức nào" });
    }
    res.json(newsList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy tin tức', error: error.message });
  }
};

// Lấy tin tức theo ID (chỉ tăng views nếu không phải admin)
exports.getNewsById = async (req, res) => {
  try {
    const isAdmin = !!req.headers.authorization; // Kiểm tra nếu có Authorization header (admin)

    let news;
    if (isAdmin) {
      news = await News.findOne({ id: req.params.id });
    } else {
      news = await News.findOneAndUpdate(
        { id: req.params.id },
        { $inc: { views: 1 } },
        { new: true }
      );
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

    let query = News.find({ status: 'show' }).sort({ views: -1 });

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
      slug,
      category,
      thumbnailCaption,
      publishedAt,
      views,
      status,
      contentBlocks: rawContentBlocks,
    } = req.body;

    const thumbnail = req.files && req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
    let thumbnailUrl = req.body.thumbnailUrl;
    if (thumbnail) {
      thumbnailUrl = `images/${thumbnail.filename}`; // Sử dụng file upload nếu có
    }
    if (!thumbnailUrl) {
      return res.status(400).json({ error: 'Thumbnail URL hoặc file là bắt buộc' });
    }

    const newId = new mongoose.Types.ObjectId().toString();

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

    // Xử lý contentImages
    const contentImages = req.files && req.files['contentImages'] ? req.files['contentImages'] : [];
    const uploadedImages = contentImages.map(file => ({
      type: 'image',
      id: new mongoose.Types.ObjectId().toString(),
      url: `images/${file.filename}`,
      caption: '',
    }));

    let imageIndex = 0;
    const finalContentBlocks = contentBlocks.map(block => {
      if (block.type === 'image') {
        if (block.url && !block.url.startsWith('blob:') && !block.url.includes('placeholder')) {
          return { ...block, id: block.id || new mongoose.Types.ObjectId().toString() };
        }
        if (imageIndex < uploadedImages.length) {
          return {
            ...uploadedImages[imageIndex++],
            caption: block.caption || '',
            id: block.id || new mongoose.Types.ObjectId().toString(),
          };
        }
        return null; // Đánh dấu block không hợp lệ
      }
      if (block.type === 'text' && !block.content) {
        return null;
      }
      if (block.type === 'list' && (!Array.isArray(block.content) || block.content.length === 0)) {
        return null;
      }
      if (['text', 'heading', 'sub_heading', 'list'].includes(block.type)) {
        return {
          ...block,
          id: block.id || new mongoose.Types.ObjectId().toString(),
          url: block.url || '',
          caption: block.caption || '',
        };
      }
      return null;
    }).filter(block => block !== null);

    while (imageIndex < uploadedImages.length) {
      finalContentBlocks.push(uploadedImages[imageIndex++]);
    }

    if (finalContentBlocks.some(block => !['text', 'image', 'heading', 'sub_heading', 'list'].includes(block.type))) {
      return res.status(400).json({ error: 'Loại contentBlock không hợp lệ' });
    }

    const newNews = new News({
      id: newId,
      title,
      slug,
      category: category || '',
      thumbnailUrl,
      thumbnailCaption: thumbnailCaption || '',
      publishedAt: new Date(publishedAt),
      views: parseInt(views, 10) || 0,
      status: status || 'show',
      contentBlocks: finalContentBlocks,
    });

    await newNews.save();
    res.status(201).json({
      message: 'Tạo tin tức thành công',
      news: newNews,
    });
  } catch (err) {
    console.error('POST /api/news error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: `ID hoặc slug đã tồn tại` });
    }
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật tin tức theo ID
exports.updateNews = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    slug,
    category,
    thumbnailUrl,
    thumbnailCaption,
    publishedAt,
    views,
    status,
    contentBlocks: rawContentBlocks,
  } = req.body;

  try {
    let contentBlocks = typeof rawContentBlocks === 'string' ? JSON.parse(rawContentBlocks) : rawContentBlocks;

    if (!Array.isArray(contentBlocks)) contentBlocks = [];

    const files = req.files || {};
    const thumbnail = files['thumbnail'] && files['thumbnail'].length > 0 ? files['thumbnail'][0] : null;
    const contentImages = files['contentImages'] && Array.isArray(files['contentImages']) ? files['contentImages'] : [];

    const uploadedImages = contentImages.map(file => ({
      type: 'image',
      id: new mongoose.Types.ObjectId().toString(),
      url: `images/${file.filename}`,
      caption: '',
    }));

    let imageIndex = 0;
    const finalContentBlocks = contentBlocks.map(block => {
      if (block.type === 'image') {
        if (block.url && !block.url.startsWith('blob:') && !block.url.includes('placeholder')) {
          return { ...block, id: block.id || new mongoose.Types.ObjectId().toString() };
        }
        if (imageIndex < uploadedImages.length) {
          return {
            ...uploadedImages[imageIndex++],
            caption: block.caption || '',
            id: block.id || new mongoose.Types.ObjectId().toString(),
          };
        }
        return null;
      }
      if (block.type === 'text' && (!block.content || typeof block.content !== 'string')) {
        return null;
      }
      if (block.type === 'list' && (!Array.isArray(block.content) || block.content.length === 0)) {
        return null;
      }
      if (['text', 'heading', 'sub_heading', 'list'].includes(block.type)) {
        return {
          ...block,
          id: block.id || new mongoose.Types.ObjectId().toString(),
          url: block.url || '',
          caption: block.caption || '',
        };
      }
      return null;
    }).filter(block => block !== null);

    while (imageIndex < uploadedImages.length) {
      finalContentBlocks.push(uploadedImages[imageIndex++]);
    }

    const finalThumbnailUrl = thumbnail ? `images/${thumbnail.filename}` : (thumbnailUrl || '');

    if (!finalThumbnailUrl) {
      return res.status(400).json({ error: 'Thumbnail URL hoặc file là bắt buộc' });
    }

    const updatedNews = await News.findOneAndUpdate(
      { id },
      {
        title,
        slug,
        category: category || '',
        thumbnailUrl: finalThumbnailUrl,
        thumbnailCaption: thumbnailCaption || '',
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        views: parseInt(views, 10) || 0,
        status: status || 'show',
        contentBlocks: finalContentBlocks,
      },
      { new: true, runValidators: true }
    );

    if (!updatedNews) return res.status(404).json({ error: 'Không tìm thấy tin tức để cập nhật' });

    res.json({
      message: 'Cập nhật tin tức thành công',
      news: updatedNews,
    });
  } catch (err) {
    console.error(`PUT /api/news/${id} error:`, err);
    res.status(400).json({ error: err.message });
  }
};

// Xóa tin tức theo ID
exports.deleteNews = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedNews = await News.findOneAndDelete({ id });
    if (!deletedNews) {
      return res.status(404).json({ message: 'Không tìm thấy tin tức để xóa' });
    }
    res.json({ message: 'Xóa tin tức thành công' });
  } catch (err) {
    console.error(`DELETE /api/news/${id} error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// Chuyển đổi trạng thái hiển thị của tin tức
exports.toggleNewsVisibility = async (req, res) => {
  const { id } = req.params;

  try {
    const news = await News.findOne({ id });
    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy tin tức' });
    }

    news.status = news.status === 'show' ? 'hidden' : 'show';
    await news.save();

    const updatedNews = await News.findOne({ id });

    res.json({
      message: `Tin tức đã được ${updatedNews.status === 'show' ? 'hiển thị' : 'ẩn'}`,
      news: updatedNews,
    });
  } catch (err) {
    console.error(`PUT /api/news/${id}/toggle-visibility error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

exports.uploadMiddleware = [upload.array('images', 10), handleMulterError];