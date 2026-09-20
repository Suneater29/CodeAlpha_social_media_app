const API_BASE = '/api';
function getToken() {
  return localStorage.getItem('token');
}
function getCurrentUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
function requireLogin() {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      window.location.href = '/login.html';
    }
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

async function uploadImage(file) {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      'Only JPG, PNG, GIF and WebP images are supported.'
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be smaller than 5 MB.');
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error('Could not read the image.'));
    };

    reader.readAsDataURL(file);
  });

  const result = await api('/uploads/image', {
    method: 'POST',
    body: {
      image: dataUrl
    }
  });

  return result.url;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function initials(username) {
  return (username || '?').slice(0, 2).toUpperCase();
}

function avatarHTML(user) {
  if (user && user.avatar) {
    return `
      <div class="avatar">
        <img src="${escapeHTML(user.avatar)}" alt="">
      </div>
    `;
  }

  return `
    <div class="avatar">
      ${initials(user ? user.username : '?')}
    </div>
  `;
}


function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

let toastTimer = null;
function showToast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function renderTopbar(activePage) {
  const mount = document.getElementById('topbar');
  if (!mount) return;
  const me = getCurrentUser();

  mount.innerHTML = `
    <div class="brand">Mini Social</div>
    <nav>
      <a href="/index.html" ${activePage === 'feed' ? 'style="color:var(--text)"' : ''}>Feed</a>
      <a href="/profile.html?id=${me ? me.id : ''}" ${activePage === 'profile' ? 'style="color:var(--text)"' : ''}>My Profile</a>
      <a href="#" id="logoutLink">Log out</a>
    </nav>
  `;

  document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = '/login.html';
  });
}
