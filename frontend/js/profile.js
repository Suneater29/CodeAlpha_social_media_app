requireLogin();
renderTopbar('profile');

const params = new URLSearchParams(window.location.search);
const profileId = params.get('id');

const headerEl = document.getElementById('profileHeader');
const postList = document.getElementById('profilePostList');

if (!profileId) {
  headerEl.innerHTML = `
    <div class="empty-state">
      No user specified.
    </div>
  `;
} else {
  loadProfile();
}

async function loadProfile() {
  headerEl.innerHTML = `
    <div class="empty-state">
      Loading profile...
    </div>
  `;

  try {
    const { user, posts } =
      await api(`/users/${profileId}`);

    headerEl.innerHTML =
      renderHeader(user);

    attachHeaderHandlers(user);

    renderPostsInto(
      postList,
      posts,
      "This user hasn't posted anything yet."
    );

  } catch (err) {
    headerEl.innerHTML = `
      <div class="empty-state">
        Couldn't load this profile:
        ${escapeHTML(err.message)}
      </div>
    `;
  }
}

function renderHeader(user) {
  return `
    <div class="profile-header">

      ${avatarHTML(user)}

      <div style="flex:1;">

        <h1>
          ${escapeHTML(user.username)}
        </h1>

        <div class="profile-stats">
          <span>
            <strong>${user.followerCount}</strong>
            followers
          </span>

          <span>
            <strong>${user.followingCount}</strong>
            following
          </span>
        </div>

        <p class="bio">
          ${
            user.bio
              ? escapeHTML(user.bio)
              : 'No bio yet.'
          }
        </p>

        <div class="actions">

          ${
            user.isMe
              ? `
                <button
                  id="editProfileBtn"
                  class="btn-ghost"
                >
                  Edit profile
                </button>
              `
              : `
                <button
                  id="followBtn"
                  class="${
                    user.isFollowedByMe
                      ? 'btn-ghost'
                      : 'btn-primary'
                  }"
                >
                  ${
                    user.isFollowedByMe
                      ? 'Unfollow'
                      : 'Follow'
                  }
                </button>
              `
          }

        </div>

        ${
          user.isMe
            ? `
              <form
                id="editProfileForm"
                style="display:none; margin-top:12px;"
              >

                <div class="field">

                  <label>
                    Bio
                  </label>

                  <textarea
                    id="editBio"
                    maxlength="160"
                  >${escapeHTML(user.bio || '')}</textarea>

                </div>

                <div class="field">

                  <label
                    class="file-input-label"
                    for="editAvatar"
                  >
                    📷 Choose profile picture
                  </label>

                  <input
                    type="file"
                    id="editAvatar"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                  >

                  <div class="file-name">
                    JPG, PNG, GIF or WebP.
                    Maximum 5 MB.
                  </div>

                </div>

                <button
                  type="submit"
                  class="btn-primary"
                >
                  Save
                </button>

              </form>
            `
            : ''
        }

      </div>

    </div>
  `;
}

function attachHeaderHandlers(user) {
  if (user.isMe) {

    const editBtn =
      document.getElementById('editProfileBtn');

    const form =
      document.getElementById('editProfileForm');

    editBtn.addEventListener('click', () => {
      form.style.display =
        form.style.display === 'none'
          ? 'block'
          : 'none';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        const bio =
          document
            .getElementById('editBio')
            .value
            .trim();

        const avatarFile =
          document
            .getElementById('editAvatar')
            .files[0];

        let avatar = user.avatar || '';

        if (avatarFile) {
          avatar = await uploadImage(avatarFile);
        }

        const updated =
          await api(`/users/${profileId}`, {
            method: 'PUT',
            body: {
              bio,
              avatar
            }
          });

        const cached = getCurrentUser();

        saveSession(
          getToken(),
          {
            ...cached,
            bio: updated.bio,
            avatar: updated.avatar
          }
        );

        showToast('Profile updated');

        loadProfile();

      } catch (err) {
        showToast(err.message);
      }
    });

  } else {

    const followBtn =
      document.getElementById('followBtn');

    followBtn.addEventListener(
      'click',
      async () => {
        try {

          await api(
            `/users/${profileId}/follow`,
            {
              method: 'POST'
            }
          );

          loadProfile();

        } catch (err) {
          showToast(err.message);
        }
      }
    );
  }
}