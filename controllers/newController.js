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
      return res.status(404).json({ message: 'Không tìm thấy tin tức nào' });
    }
    res.json(newsList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy tin tức', error: error.message });
  }
};

// Lấy tin tức theo slug (chỉ tăng views nếu không phải admin)
exports.getNewsBySlug = async (req, res) => {
  try {
    const isAdmin = !!req.headers.authorization;

    let news;
    if (isAdmin) {
      news = await News.findOne({ slug: req.params.slug });
    } else {
      news = await News.findOneAndUpdate(
        { slug: req.params.slug },
        { $inc: { views: 1 } },
        { new: true }
      );
    }

    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy tin tức' });
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy tin tức', error: error.message });
  }
};

// Tạo tin tức mới
exports.createNews = async (req, res) => {
  try {
    const {
      category,
      slug,
      title,
      thumbnailCaption,
      publishedAt,
      views,
      status,
      content,
    } = req.body;

    // Validate slug format
    if (!validator.matches(slug, /^[a-z0-9-]+$/)) {
      return res.status(400).json({ error: 'Slug không hợp lệ: chỉ được chứa chữ cái, số và dấu gạch ngang' });
    }

    // Xử lý thumbnail
    const thumbnail = req.files && req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
    let thumbnailUrl = req.body.thumbnailUrl;
    if (thumbnail) {
      thumbnailUrl = `images/${thumbnail.filename}`;
    }
    if (!thumbnailUrl) {
      return res.status(400).json({ error: 'Thumbnail URL hoặc file là bắt buộc' });
    }

    // Xử lý nội dung HTML và hình ảnh
    let updatedContent = content || '';
    if (req.files && req.files['contentImages']) {
      const $ = cheerio.load(updatedContent, { decodeEntities: false }); // Load nội dung HTML
      const contentImages = req.files['contentImages'];

      // Lặp qua các file ảnh và thay thế trong nội dung
      contentImages.forEach((file, index) => {
        const imageUrl = `images/${file.filename}`;
        // Giả sử frontend gửi các thẻ <img> với data-index để đánh dấu
        $(`img[data-index="${index}"]`).attr('src', imageUrl).removeAttr('data-index');
      });

      updatedContent = $.html(); // Cập nhật nội dung HTML
    }

    const newNews = new News({
      title,
      slug,
      category: category || '',
      thumbnailUrl,
      thumbnailCaption: thumbnailCaption || '',
      publishedAt: new Date(publishedAt || Date.now()),
      views: parseInt(views, 10) || 0,
      status: status || 'show',
      content: updatedContent,
    });

    await newNews.save();
    res.status(201).json({
      message: 'Tạo tin tức thành công',
      news: newNews,
    });
  } catch (err) {
    console.error('POST /api/news error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Slug đã tồn tại' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: `Dữ liệu không hợp lệ: ${err.message}` });
    }
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật tin tức theo slug
exports.updateNews = async (req, res) => {
  const { slug } = req.params;
  const {
    category,
    slug: newSlug,
    title,
    thumbnailUrl,
    thumbnailCaption,
    publishedAt,
    views,
    status,
    content,
  } = req.body;

  try {
    // Validate newSlug if provided
    if (newSlug && !validator.matches(newSlug, /^[a-z0-9-]+$/)) {
      return res.status(400).json({ error: 'Slug mới không hợp lệ: chỉ được chứa chữ cái, số và dấu gạch ngang' });
    }

    // Xử lý thumbnail
    const files = req.files || {};
    const thumbnail = files['thumbnail'] && files['thumbnail'].length > 0 ? files['thumbnail'][0] : null;
    const finalThumbnailUrl = thumbnail ? `images/${thumbnail.filename}` : (thumbnailUrl || '');

    if (!finalThumbnailUrl) {
      return res.status(400).json({ error: 'Thumbnail URL hoặc file là bắt buộc' });
    }

    // Xử lý nội dung HTML và hình ảnh
    let updatedContent = content || '';
    if (files['contentImages']) {
      const $ = cheerio.load(updatedContent, { decodeEntities: false });
      const contentImages = files['contentImages'];

      contentImages.forEach((file, index) => {
        const imageUrl = `images/${file.filename}`;
        $(`img[data-index="${index}"]`).attr('src', imageUrl).removeAttr('data-index');
      });

      updatedContent = $.html();
    }

    const updatedNews = await News.findOneAndUpdate(
      { slug },
      {
        title,
        slug: newSlug || slug,
        category: category || '',
        thumbnailUrl: finalThumbnailUrl,
        thumbnailCaption: thumbnailCaption || '',
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        views: parseInt(views, 10) || 0,
        status: status || 'show',
        content: updatedContent,
      },
      { new: true, runValidators: true }
    );

    if (!updatedNews) return res.status(404).json({ error: 'Không tìm thấy tin tức để cập nhật' });

    res.json({
      message: 'Cập nhật tin tức thành công',
      news: updatedNews,
    });
  } catch (err) {
    console.error(`PUT /api/news/${slug} error:`, err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Slug mới đã tồn tại' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: `Dữ liệu không hợp lệ: ${err.message}` });
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
    res.status(500).json({ error: 'Lỗi máy chủ', details: err.message });
  }
};

// Chuyển đổi trạng thái hiển thị của tin tức theo slug
exports.toggleNewsVisibility = async (req, res) => {
  const { slug } = req.params;

  try {
    const news = await News.findOne({ slug });
    if (!news) {
      return res.status(404).json({ message: 'Không tìm thấy tin tức' });
    }

    news.status = news.status === 'show' ? 'hidden' : 'show';
    await news.save({ validateBeforeSave: true });

    res.json({
      message: `Tin tức đã được ${news.status === 'show' ? 'hiển thị' : 'ẩn'}`,
      news,
    });
  } catch (err) {
    console.error(`PUT /api/news/${slug}/toggle-visibility error:`, err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: `Dữ liệu không hợp lệ: ${err.message}` });
    }
    res.status(500).json({ error: 'Lỗi máy chủ', details: err.message });
  }
};

exports.uploadMiddleware = [upload.array('images', 10), handleMulterError];