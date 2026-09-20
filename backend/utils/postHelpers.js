const db = require('../db');

// One query per post list, no N+1: like/comment counts and "did the viewer
// like this" are computed as subqueries right in the SELECT.
const POST_SELECT = `
  SELECT
    p.id,
    p.content,
    p.image,
    p.created_at,
    u.id AS author_id,
    u.username AS author_username,
    u.avatar AS author_avatar,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = @viewerId) AS liked_by_me
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;

function mapPostRow(row) {
  return {
    _id: row.id,
    author: {
      _id: row.author_id,
      username: row.author_username,
      avatar: row.author_avatar,
    },
    content: row.content,
    image: row.image,
    createdAt: row.created_at,
    likeCount: row.like_count,
    likedByMe: !!row.liked_by_me,
    commentCount: row.comment_count,
  };
}

function getFeedPosts({ viewerId, authorIds = null, limit = 50 }) {
  let sql = POST_SELECT;
  const params = { viewerId };

  if (authorIds) {
    if (authorIds.length === 0) return []; // following nobody -> empty feed, skip the query
    const placeholders = authorIds.map((_, i) => `@a${i}`).join(', ');
    authorIds.forEach((id, i) => (params[`a${i}`] = id));
    sql += ` WHERE p.author_id IN (${placeholders})`;
  }

  sql += ' ORDER BY p.created_at DESC LIMIT @limit';
  params.limit = limit;

  return db.prepare(sql).all(params).map(mapPostRow);
}

function getPostById(postId, viewerId) {
  const row = db.prepare(POST_SELECT + ' WHERE p.id = @postId').get({ viewerId, postId });
  return row ? mapPostRow(row) : null;
}

function getCommentsForPost(postId) {
  const rows = db
    .prepare(
      `SELECT c.id, c.text, c.created_at, u.id AS author_id, u.username AS author_username, u.avatar AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`
    )
    .all(postId);

  return rows.map((row) => ({
    _id: row.id,
    text: row.text,
    createdAt: row.created_at,
    author: { _id: row.author_id, username: row.author_username, avatar: row.author_avatar },
  }));
}

module.exports = { getFeedPosts, getPostById, getCommentsForPost };
