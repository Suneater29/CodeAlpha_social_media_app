const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { getFeedPosts } = require('../utils/postHelpers');

const router = express.Router();

function followerCount(userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM follows WHERE following_id = ?').get(userId).n;
}
function followingCount(userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?').get(userId).n;
}
function isFollowing(followerId, followingId) {
  return !!db
    .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(followerId, followingId);
}

// GET /api/users/:id - profile + their posts, shaped to match the feed's post format.
// Requires auth (the whole app is login-gated) so we can report follow/like state.
router.get('/:id', requireAuth, (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const posts = getFeedPosts({ viewerId: req.userId, authorIds: [userId] });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        avatar: user.avatar,
        followerCount: followerCount(userId),
        followingCount: followingCount(userId),
        isFollowedByMe: isFollowing(req.userId, userId),
        isMe: userId === req.userId,
      },
      posts,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/users/:id - update own bio/avatar
router.put('/:id', requireAuth, (req, res) => {
  const userId = Number(req.params.id);
  if (userId !== req.userId) {
    return res.status(403).json({ message: "You can't edit another user's profile" });
  }
  try {
    const { bio = '', avatar = '' } = req.body;
    db.prepare('UPDATE users SET bio = ?, avatar = ? WHERE id = ?').run(bio, avatar, userId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ id: user.id, username: user.username, bio: user.bio, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/users/:id/follow - toggles follow/unfollow of :id by the logged-in user
router.post('/:id/follow', requireAuth, (req, res) => {
  const targetId = Number(req.params.id);

  if (targetId === req.userId) {
    return res.status(400).json({ message: "You can't follow yourself" });
  }

  try {
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const already = isFollowing(req.userId, targetId);

    if (already) {
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.userId, targetId);
    } else {
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.userId, targetId);
    }

    res.json({ following: !already, followerCount: followerCount(targetId) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', requireAuth, (req, res) => {
  const userId = Number(req.params.id);
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.avatar, u.bio FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ?`
    )
    .all(userId);
  res.json(rows.map((r) => ({ _id: r.id, username: r.username, avatar: r.avatar, bio: r.bio })));
});

// GET /api/users/:id/following
router.get('/:id/following', requireAuth, (req, res) => {
  const userId = Number(req.params.id);
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.avatar, u.bio FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ?`
    )
    .all(userId);
  res.json(rows.map((r) => ({ _id: r.id, username: r.username, avatar: r.avatar, bio: r.bio })));
});

module.exports = router;
