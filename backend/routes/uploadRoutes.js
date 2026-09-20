const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const requireAuth = require('../middleware/auth');
const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post('/image', requireAuth, (req, res) => {
  try {
    const { image } = req.body || {};
    if (typeof image !== 'string' || !image.startsWith('data:')) {
      return res.status(400).json({
        message: 'Please provide an image file.'
      });
    }

    const match = image.match(
      /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/s
    );

    if (!match) {
      return res.status(400).json({
        message: 'Only JPG, PNG, GIF and WebP images are supported.'
      });
    }

    const mimeType = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');

    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({
        message: 'Image must be smaller than 5 MB.'
      });
    }

    const extension = ALLOWED_TYPES[mimeType];
    const filename =
      `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    res.status(201).json({
      url: `/uploads/${filename}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Image upload failed'
    });
  }
});

module.exports = router;