const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// DELETE /api/comments/:id - only the comment's author can delete it
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.author_id !== req.userId) {
      return res.status(403).json({ message: "You can't delete someone else's comment" });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
