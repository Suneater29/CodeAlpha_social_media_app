// Shared between index.html (feed) and profile.html - both load api.js then this
// file before their own page-specific script, so `me` and these functions are
// available globally (plain <script> tags share one scope, no bundler here).

const me = getCurrentUser();
const openComments = new Set(); // post ids currently showing their comment thread

function renderPostsInto(containerEl, posts, emptyMessage) {
  if (!posts || posts.length === 0) {
    containerEl.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }
  containerEl.innerHTML = posts.map(renderPostCard).join('');
  posts.forEach(attachPostHandlers);
  openComments.forEach((postId) => loadComments(postId));
}

function renderPostCard(post) {
  const author = post.author || {};
  const authorId = author._id || author.id;
  const canDelete = authorId === me.id;

  return `
    <article class="post" data-post-id="${post._id}">
      <div class="post-head">
        ${avatarHTML(author)}
        <div class="who">
          <span class="username"><a href="/profile.html?id=${authorId}">${escapeHTML(author.username)}</a></span>
          <span class="time">${timeAgo(post.createdAt)}</span>
        </div>
      </div>
      <div class="post-content">${escapeHTML(post.content)}</div>
      ${post.image ? `<img class="post-image" src="${escapeHTML(post.image)}" alt="">` : ''}
      <div class="post-actions">
        <button class="action-btn like-btn ${post.likedByMe ? 'liked' : ''}" data-id="${post._id}">
          ${post.likedByMe ? 'Liked' : 'Like'} (<span class="like-count">${post.likeCount}</span>)
        </button>
        <button class="action-btn comment-toggle" data-id="${post._id}">
          Comments (<span class="comment-count">${post.commentCount}</span>)
        </button>
        ${canDelete ? `<button class="action-btn delete-post" data-id="${post._id}">Delete</button>` : ''}
      </div>
      <div class="comments" id="comments-${post._id}" style="display:none;"></div>
    </article>
  `;
}

function attachPostHandlers(post) {
  const card = document.querySelector(`[data-post-id="${post._id}"]`);
  if (!card) return;

  card.querySelector('.like-btn').addEventListener('click', () => toggleLike(post._id));
  card.querySelector('.comment-toggle').addEventListener('click', () => toggleComments(post._id));

  const deleteBtn = card.querySelector('.delete-post');
  if (deleteBtn) deleteBtn.addEventListener('click', () => deletePost(post._id));
}

async function toggleLike(postId) {
  try {
    const res = await api(`/posts/${postId}/like`, { method: 'POST' });
    const card = document.querySelector(`[data-post-id="${postId}"]`);
    const btn = card.querySelector('.like-btn');
    btn.classList.toggle('liked', res.liked);
    btn.innerHTML = `${res.liked ? 'Liked' : 'Like'} (<span class="like-count">${res.likeCount}</span>)`;
  } catch (err) {
    showToast(err.message);
  }
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;
  try {
    await api(`/posts/${postId}`, { method: 'DELETE' });
    const card = document.querySelector(`[data-post-id="${postId}"]`);
    if (card) card.remove();
  } catch (err) {
    showToast(err.message);
  }
}

function toggleComments(postId) {
  const box = document.getElementById(`comments-${postId}`);
  const isOpen = box.style.display !== 'none';

  if (isOpen) {
    box.style.display = 'none';
    openComments.delete(postId);
  } else {
    box.style.display = 'block';
    openComments.add(postId);
    loadComments(postId);
  }
}

async function loadComments(postId) {
  const box = document.getElementById(`comments-${postId}`);
  if (!box) return;
  box.innerHTML = '<div class="empty-state" style="padding:10px;">Loading comments...</div>';

  try {
    const { comments } = await api(`/posts/${postId}`);
    box.innerHTML = renderComments(comments) + renderCommentForm();
    box.querySelector('.comment-form').addEventListener('submit', (e) => submitComment(e, postId));
    box.querySelectorAll('.comment-delete').forEach((btn) =>
      btn.addEventListener('click', () => deleteComment(btn.dataset.id, postId))
    );
  } catch (err) {
    box.innerHTML = `<div class="empty-state">Couldn't load comments</div>`;
  }
}

function renderComments(comments) {
  if (comments.length === 0) {
    return '<div class="empty-state" style="padding:8px 0;">No comments yet.</div>';
  }
  return comments
    .map((c) => {
      const canDelete = c.author._id === me.id;
      return `
        <div class="comment">
          ${avatarHTML(c.author)}
          <div class="comment-body">
            <span class="comment-author">${escapeHTML(c.author.username)}</span>${escapeHTML(c.text)}
            ${canDelete ? `<button class="comment-delete" data-id="${c._id}">delete</button>` : ''}
          </div>
        </div>
      `;
    })
    .join('');
}

function renderCommentForm() {
  return `
    <form class="comment-form">
      <input type="text" placeholder="Write a comment..." maxlength="300" required>
      <button type="submit" class="btn-primary">Post</button>
    </form>
  `;
}

async function submitComment(e, postId) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const text = input.value.trim();
  if (!text) return;

  try {
    await api(`/posts/${postId}/comments`, { method: 'POST', body: { text } });
    input.value = '';
    loadComments(postId);
    const countEl = document.querySelector(`[data-post-id="${postId}"] .comment-count`);
    if (countEl) countEl.textContent = Number(countEl.textContent) + 1;
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteComment(commentId, postId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api(`/comments/${commentId}`, { method: 'DELETE' });
    loadComments(postId);
    const countEl = document.querySelector(`[data-post-id="${postId}"] .comment-count`);
    if (countEl) countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);
  } catch (err) {
    showToast(err.message);
  }
}
