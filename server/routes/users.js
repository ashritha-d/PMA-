const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.put('/photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const photoUrl = req.file.path?.startsWith('http') ? req.file.path : `/uploads/documents/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { photo: photoUrl }, { new: true });
    res.json({ success: true, photo: photoUrl, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
