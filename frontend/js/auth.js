// If already logged in, skip straight to the feed.
if (getToken()) {
  window.location.href = '/index.html';
}

function showFormError(message) {
  const el = document.getElementById('formError');
  el.textContent = message;
  el.classList.add('show');
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      saveSession(data.token, data.user);
      window.location.href = '/index.html';
    } catch (err) {
      showFormError(err.message);
    }
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const data = await api('/auth/register', { method: 'POST', body: { username, email, password } });
      saveSession(data.token, data.user);
      window.location.href = '/index.html';
    } catch (err) {
      showFormError(err.message);
    }
  });
}
