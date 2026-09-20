const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { getFeedPosts, getPostById, getCommentsForPost } = require('../utils/postHelpers');

const router = express.Router();

// GET /api/posts             -> global feed, newest first
// GET /api/posts?following=1 -> only posts from people the logged-in user follows
router.get('/', requireAuth, (req, res) => {
  try {
    let authorIds = null;

    if (req.query.following === '1') {
      authorIds = db
        .prepare('SELECT following_id FROM follows WHERE follower_id = ?')
        .all(req.userId)
        .map((r) => r.following_id);
    }

    const posts = getFeedPosts({ viewerId: req.userId, authorIds });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/posts/:id - single post with its comments
router.get('/:id', requireAuth, (req, res) => {
  try {
    const postId = Number(req.params.id);
    const post = getPostById(postId, req.userId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comments = getCommentsForPost(postId);
    res.json({ post, comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/posts - create a post
router.post('/', requireAuth, (req, res) => {
  try {
    const { content, image = '' } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content cannot be empty' });
    }

    const info = db
      .prepare('INSERT INTO posts (author_id, content, image) VALUES (?, ?, ?)')
      .run(req.userId, content, image);

    const post = getPostById(info.lastInsertRowid, req.userId);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/posts/:id - only the author can delete
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const postId = Number(req.params.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author_id !== req.userId) {
      return res.status(403).json({ message: "You can't delete someone else's post" });
    }

    // Comments/likes for this post are removed automatically via ON DELETE CASCADE.
    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/posts/:id/like - toggle like
router.post('/:id/like', requireAuth, (req, res) => {
  try {
    const postId = Number(req.params.id);
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const already = db
      .prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?')
      .get(req.userId, postId);

    if (already) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.userId, postId);
    } else {
      db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.userId, postId);
    }

    const likeCount = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE post_id = ?').get(postId).n;
    res.json({ liked: !already, likeCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/posts/:id/comments - add a comment
router.post('/:id/comments', requireAuth, (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const info = db
      .prepare('INSERT INTO comments (post_id, author_id, text) VALUES (?, ?, ?)')
      .run(postId, req.userId, text);

    const comment = db
      .prepare(
        `SELECT c.id, c.text, c.created_at, u.id AS author_id, u.username AS author_username, u.avatar AS author_avatar
         FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?`
      )
      .get(info.lastInsertRowid);

    res.status(201).json({
      _id: comment.id,
      text: comment.text,
      createdAt: comment.created_at,
      author: { _id: comment.author_id, username: comment.author_username, avatar: comment.author_avatar },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
