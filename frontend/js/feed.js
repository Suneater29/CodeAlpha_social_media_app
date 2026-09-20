requireLogin();
renderTopbar('feed');

let currentTab = 'all';

const postList = document.getElementById('postList');

const composerForm = document.getElementById('composerForm');
const composerContent = document.getElementById('composerContent');
const composerImage = document.getElementById('composerImage');
const composerImageName = document.getElementById('composerImageName');

composerImage.addEventListener('change', () => {
  const file = composerImage.files[0];

  composerImageName.textContent = file
    ? file.name
    : '';
});

composerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const content = composerContent.value.trim();

  if (!content) {
    return;
  }

  try {
    let imageUrl = '';

    const imageFile = composerImage.files[0];

    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }

    await api('/posts', {
      method: 'POST',
      body: {
        content,
        image: imageUrl
      }
    });

    composerContent.value = '';
    composerImage.value = '';
    composerImageName.textContent = '';

    await loadFeed();

  } catch (err) {
    showToast(err.message);
  }
});

document
  .getElementById('tabAll')
  .addEventListener('click', () => {
    switchTab('all');
  });

document
  .getElementById('tabFollowing')
  .addEventListener('click', () => {
    switchTab('following');
  });

function switchTab(tab) {
  currentTab = tab;

  document
    .getElementById('tabAll')
    .classList.toggle('active', tab === 'all');

  document
    .getElementById('tabFollowing')
    .classList.toggle('active', tab === 'following');

  loadFeed();
}

async function loadFeed() {
  postList.innerHTML =
    '<div class="empty-state">Loading...</div>';

  try {
    const query =
      currentTab === 'following'
        ? '?following=1'
        : '';

    const posts = await api('/posts' + query);

    const emptyMsg =
      currentTab === 'following'
        ? "Nobody you follow has posted yet. Follow people from their profile page."
        : "No posts yet. Be the first to post something.";

    renderPostsInto(
      postList,
      posts,
      emptyMsg
    );

  } catch (err) {
    postList.innerHTML = `
      <div class="empty-state">
        Couldn't load the feed:
        ${escapeHTML(err.message)}
      </div>
    `;
  }
}

loadFeed();