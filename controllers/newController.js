const mongoose = require('mongoose');
const News = require('../models/news');
const NewCategory = require('../models/newCategory');
const validator = require('validator');
const multer = require('multer');
const { upload, handleMulterError } = require('../middlewares/upload');

// Hàm tạo slug từ title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
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
    const news = await News.findOne({ slug: req.params.slug }).populate('newCategory');
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
    if (limit > 0) query = query.limit(limit);
    const hottestNewsList = await query;
    if (hottestNewsList.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng nào' });
    }
    res.json({ message: 'Lấy danh sách bài đăng hot thành công', news: hottestNewsList });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách bài đăng hot', error: error.message });
  }
};
// Tạo tin tức mới
exports.createNews = async (req, res) => {
  try {
    const { title, thumbnailCaption, publishedAt, views, status, contentBlocks, 'category-new': categoryNew } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!title || !categoryNew?.oid) {
      return res.status(400).json({ error: 'Tiêu đề và danh mục là bắt buộc' });
    }

    // Kiểm tra danh mục hợp lệ
    const categoryId = categoryNew.oid;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: 'ID danh mục không hợp lệ' });
    }
    const category = await NewCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Danh mục không tồn tại' });
    }

    // Kiểm tra thumbnail
    const thumbnail = req.files?.thumbnail?.[0];
    if (!thumbnail) {
      return res.status(400).json({ error: 'Hình ảnh thumbnail là bắt buộc' });
    }
    const thumbnailUrl = `/images/${thumbnail.filename}`;

    // Xử lý contentBlocks
    let contentBlocksArray = [];
    if (contentBlocks) {
      try {
        contentBlocksArray = typeof contentBlocks === 'string' ? JSON.parse(contentBlocks) : contentBlocks;
        if (!Array.isArray(contentBlocksArray)) {
          return res.status(400).json({ error: 'contentBlocks phải là một mảng' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'contentBlocks JSON không hợp lệ' });
      }
    }

    // Xử lý hình ảnh nội dung
    const uploadedImages = req.files?.contentImages || [];
    const imageMap = new Map(uploadedImages.map((file, index) => [index, `/images/${file.filename}`]));
    let imageIndex = 0;

    const finalContentBlocks = contentBlocksArray
      .map((block) => {
        if (!block || typeof block !== 'object') return null;

        // Xác định type nếu không có
        if (!block.type) {
          if (block.url?.trim()) block.type = 'image';
          else if (block.content?.trim().includes('<li>')) block.type = 'list';
          else if (block.content?.trim()) block.type = 'text';
          else return null;
        }

        // Xử lý image block
        if (block.type === 'image') {
          if (block.url && !block.url.startsWith('blob:') && !block.url.includes('placeholder') && (block.url.startsWith('http://') || block.url.startsWith('https://'))) {
            return { type: 'image', content: '', url: block.url, caption: block.caption || '' };
          }
          const url = imageMap.get(imageIndex++);
          return url ? { type: 'image', content: '', url, caption: block.caption || '' } : null;
        }

        // Xử lý list block (giữ HTML)
        if (block.type === 'list') {
          if (block.content?.trim() && block.content.includes('<li>')) {
            return { type: 'list', content: block.content, caption: block.caption || '' };
          }
          return null;
        }

        // Xử lý text block
        if (block.type === 'text' && block.content?.trim()) {
          return { type: 'text', content: block.content, caption: block.caption || '' };
        }

        return null;
      })
      .filter((block) => block !== null);

    // Thêm các hình ảnh còn lại
    while (imageIndex < uploadedImages.length) {
      const url = imageMap.get(imageIndex++);
      if (url) finalContentBlocks.push({ type: 'image', content: '', url, caption: '' });
    }

    // Sử dụng ngày hiện tại làm mặc định cho publishedAt
    const parsedPublishedAt = new Date(publishedAt || new Date().toISOString());
    if (isNaN(parsedPublishedAt.getTime())) {
      return res.status(400).json({ error: 'Ngày xuất bản (publishedAt) không hợp lệ' });
    }

    // Tạo slug và kiểm tra trùng lặp
    const slug = generateSlug(title);
    const existingNews = await News.findOne({ slug });
    if (existingNews) {
      return res.status(400).json({ error: 'Tiêu đề này đã tồn tại, vui lòng chọn tiêu đề khác' });
    }

    // Tạo tin tức mới
    const newNews = new News({
      id: new mongoose.Types.ObjectId().toString(),
      title,
      slug,
      thumbnailUrl,
      thumbnailCaption: thumbnailCaption || '',
      publishedAt: parsedPublishedAt,
      views: parseInt(views) || 0,
      status: status || 'show',
      contentBlocks: finalContentBlocks,
      newCategory: categoryId,
    });

    const savedNews = await newNews.save();
    const populatedNews = await News.findById(savedNews._id).populate('newCategory');
    res.status(201).json({ message: 'Tạo tin tức thành công', news: populatedNews });
  } catch (err) {
    console.error('POST /api/news error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Tiêu đề này đã tồn tại, vui lòng chọn tiêu đề khác' });
    }
    res.status(500).json({ error: 'Lỗi server khi tạo tin tức', details: err.message });
  }
};

// Cập nhật tin tức
exports.updateNews = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, thumbnailCaption, publishedAt, views, status, contentBlocks, 'category-new': categoryNew } = req.body;

    // Kiểm tra tin tức tồn tại
    const existingNews = await News.findOne({ slug });
    if (!existingNews) {
      return res.status(404).json({ error: 'Không tìm thấy tin tức để cập nhật' });
    }

    // Kiểm tra danh mục nếu được cung cấp
    let categoryId = categoryNew; // Sử dụng trực tiếp categoryNew làm _id
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ error: 'ID danh mục không hợp lệ' });
      }
      const category = await NewCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({ error: 'Danh mục không tồn tại' });
      }
    }

    // Xử lý contentBlocks
    let contentBlocksArray = [];
    if (contentBlocks) {
      try {
        contentBlocksArray = typeof contentBlocks === 'string' ? JSON.parse(contentBlocks) : contentBlocks;
        if (!Array.isArray(contentBlocksArray)) {
          return res.status(400).json({ error: 'contentBlocks phải là một mảng' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'contentBlocks JSON không hợp lệ' });
      }
    }

    // Xử lý hình ảnh nội dung
    const uploadedImages = req.files?.contentImages || [];
    const imageMap = new Map(uploadedImages.map((file, index) => [index, `/images/${file.filename}`]));
    let imageIndex = 0;

    const finalContentBlocks = contentBlocksArray
      .map((block) => {
        if (!block || typeof block !== 'object') return null;

        // Xác định type nếu không có
        if (!block.type) {
          if (block.url?.trim()) block.type = 'image';
          else if (block.content?.trim().includes('<li>')) block.type = 'list';
          else if (block.content?.trim()) block.type = 'text';
          else return null;
        }

        // Xử lý image block
        if (block.type === 'image') {
          if (block.url && !block.url.startsWith('blob:') && !block.url.includes('placeholder') && (block.url.startsWith('http://') || block.url.startsWith('https://'))) {
            return { type: 'image', content: '', url: block.url, caption: block.caption || '' };
          }
          const url = imageMap.get(imageIndex++);
          return url ? { type: 'image', content: '', url, caption: block.caption || '' } : null;
        }

        // Xử lý list block (giữ HTML)
        if (block.type === 'list') {
          if (block.content?.trim() && block.content.includes('<li>')) {
            return { type: 'list', content: block.content, caption: block.caption || '' };
          }
          return null;
        }

        // Xử lý text block
        if (block.type === 'text' && block.content?.trim()) {
          return { type: 'text', content: block.content, caption: block.caption || '' };
        }

        return null;
      })
      .filter((block) => block !== null);

    // Thêm các hình ảnh còn lại
    while (imageIndex < uploadedImages.length) {
      const url = imageMap.get(imageIndex++);
      if (url) finalContentBlocks.push({ type: 'image', content: '', url, caption: '' });
    }

    // Sử dụng ngày hiện tại làm mặc định cho publishedAt
    const parsedPublishedAt = new Date(publishedAt || new Date().toISOString());
    if (isNaN(parsedPublishedAt.getTime())) {
      return res.status(400).json({ error: 'Ngày xuất bản (publishedAt) không hợp lệ' });
    }

    // Tạo dữ liệu cập nhật
    const updateData = {
      title: title || existingNews.title,
      thumbnailCaption: thumbnailCaption || existingNews.thumbnailCaption,
      publishedAt: parsedPublishedAt,
      views: parseInt(views) >= 0 ? parseInt(views) : existingNews.views,
      status: status || existingNews.status,
      contentBlocks: finalContentBlocks.length > 0 ? finalContentBlocks : existingNews.contentBlocks,
      newCategory: categoryId || existingNews.newCategory, // Sử dụng categoryId trực tiếp
    };

    // Xử lý thumbnail nếu có
    const thumbnail = req.files?.thumbnail?.[0];
    if (thumbnail) {
      updateData.thumbnailUrl = `/images/${thumbnail.filename}`;
    }

    // Kiểm tra và cập nhật slug nếu tiêu đề thay đổi
    if (title && title !== existingNews.title) {
      const newSlug = generateSlug(title); // Giả sử generateSlug là hàm tạo slug
      const slugCheck = await News.findOne({ slug: newSlug, _id: { $ne: existingNews._id } });
      if (slugCheck) {
        return res.status(400).json({ error: 'Tiêu đề này đã tồn tại, vui lòng chọn tiêu đề khác' });
      }
      updateData.slug = newSlug;
    }

    // Cập nhật tin tức
    const updatedNews = await News.findOneAndUpdate(
      { slug },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('newCategory');

    res.json({ message: 'Cập nhật tin tức thành công', news: updatedNews });
  } catch (err) {
    console.error(`PUT /api/news/${req.params.slug} error:`, err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Tiêu đề này đã tồn tại, vui lòng chọn tiêu đề khác' });
    }
    res.status(500).json({ error: 'Lỗi server khi cập nhật tin tức', details: err.message });
  }
};

// Xóa tin tức
exports.deleteNews = async (req, res) => {
  try {
    const { slug } = req.params;
    const deletedNews = await News.findOneAndDelete({ slug });
    if (!deletedNews) return res.status(404).json({ message: 'Không tìm thấy tin tức để xóa' });
    res.json({ message: 'Xóa tin tức thành công' });
  } catch (err) {
    console.error(`DELETE /api/news/${slug} error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// Chuyển đổi trạng thái hiển thị
exports.toggleNewsVisibility = async (req, res) => {
  try {
    const { slug } = req.params;
    const news = await News.findOne({ slug }).populate('newCategory');
    if (!news) return res.status(404).json({ message: 'Không tìm thấy tin tức' });
    news.status = news.status === 'show' ? 'hidden' : 'show';
    await news.save();
    const updatedNews = await News.findOne({ slug }).populate('newCategory');
    res.json({ message: `Tin tức đã được ${updatedNews.status === 'show' ? 'hiển thị' : 'ẩn'}`, news: updatedNews });
  } catch (err) {
    console.error(`PUT /api/news/${slug}/toggle-visibility error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

exports.uploadMiddleware = [
  upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'contentImages', maxCount: 10 }]),
  handleMulterError,
];