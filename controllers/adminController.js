const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');


// Đăng nhập admin
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp username và password' });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ message: 'Tài khoản không tồn tại' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu sai' });
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Đăng nhập thành công',
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error.message, error.stack);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Kiểm tra trạng thái admin
const getAdmin = (req, res) => {
    res.json({
        message: 'Truy cập thành công',
        admin: {
            id: req.admin._id,
            username: req.admin.username,
            role: req.admin.role
        }
    });
};

// Tạo admin mới
const createAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp username và password' });
        }

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Username đã tồn tại' });
        }

        const newAdmin = new Admin({ username, password });
        await newAdmin.save();

        res.status(201).json({ message: 'Tạo admin thành công', admin: { username: newAdmin.username } });
    } catch (error) {
        console.error('Lỗi tạo admin:', error.message, error.stack);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = { login, getAdmin, createAdmin };