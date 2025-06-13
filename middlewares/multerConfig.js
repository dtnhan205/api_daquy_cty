const multer = require('multer');
const path = require('path');
const fs = require('fs');

const imageUploadDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

const cvUploadDir = path.join(__dirname, '../public/cv');
if (!fs.existsSync(cvUploadDir)) {
  fs.mkdirSync(cvUploadDir, { recursive: true });
  fs.chmodSync(cvUploadDir, 0o755); 
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'resume') {
      cb(null, cvUploadDir); 
    } else {
      cb(null, imageUploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const checkFile = (req, file, cb) => {
  if (file.fieldname === 'resume') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file PDF cho CV!'), false);
    }
  } else {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    const extname = allowedExtensions.includes(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file ảnh (jpg, jpeg, png, gif, webp, svg)'));
    }
  }
};

module.exports = multer({
  storage,
  fileFilter: checkFile,
  limits: { fileSize: 10 * 1024 * 1024 },
});