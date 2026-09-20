# Mini Social Media App

CodeAlpha internship task — user profiles, posts & comments, like/follow system.
Frontend: plain HTML/CSS/JS. Backend: Express.js + SQLite (better-sqlite3). Auth: JWT.

Runs off a single database **file** — no MongoDB, no service to install, no admin
privileges needed. `npm install` creates a prebuilt native binary for SQLite; the
database itself (`backend/data/app.db`) is created automatically the first time
you run the server.

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to any long random string. `PORT` defaults to 5000.

Run it:

```bash
npm start
```

You should see:
```
Server running on http://localhost:5000
```

A `backend/data/app.db` file appears the first time you run it — that's your whole
database. Delete it any time to wipe all data and start fresh.

## 2. Open the app

The Express server also serves the frontend as static files, so there's nothing
separate to run — just open:

```
http://localhost:5000
```

Register an account, then open a second browser (or an incognito window) and
register a second account so you have someone to follow/like/comment with.

## Project structure

```
backend/
  server.js            entry point — mounts routes, serves frontend
  db.js                opens data/app.db, creates tables if they don't exist
  middleware/auth.js   JWT verification middleware
  utils/postHelpers.js shared SQL queries for posts + comments (joins, like/comment counts)
  routes/              authRoutes, userRoutes, postRoutes, commentRoutes
  data/app.db          the database file (created on first run, gitignored)
frontend/
  index.html           feed (composer + all/following tabs)
  login.html / register.html
  profile.html         profile header, follow button, edit bio, user's posts
  js/api.js            fetch wrapper + shared helpers (used by every page)
  js/posts.js          shared post/comment rendering (used by feed + profile)
  css/style.css        one shared stylesheet
```

## Database schema (SQLite)

```
users     (id, username, email, password, bio, avatar, created_at)
posts     (id, author_id -> users.id, content, image, created_at)
comments  (id, post_id -> posts.id, author_id -> users.id, text, created_at)
likes     (user_id, post_id)         -- composite primary key, one row per like
follows   (follower_id, following_id) -- composite primary key, one row per follow
```

Likes and follows are many-to-many relationships, so they're join tables rather than
arrays on the user/post row (which is how the earlier MongoDB version modeled them).
Foreign keys use `ON DELETE CASCADE`, so deleting a post also removes its comments and
likes automatically.

## API reference

| Method | Endpoint                        | Auth | Description                          |
|--------|----------------------------------|------|---------------------------------------|
| POST   | /api/auth/register              | no   | Create account, returns token         |
| POST   | /api/auth/login                 | no   | Log in, returns token                 |
| GET    | /api/auth/me                    | yes  | Current user                          |
| GET    | /api/users/:id                  | yes  | Profile + their posts                 |
| PUT    | /api/users/:id                  | yes  | Update own bio/avatar                 |
| POST   | /api/users/:id/follow           | yes  | Toggle follow/unfollow                |
| GET    | /api/users/:id/followers         | yes  | List followers                        |
| GET    | /api/users/:id/following         | yes  | List following                        |
| GET    | /api/posts?following=1          | yes  | Feed (all, or just followed users)    |
| GET    | /api/posts/:id                  | yes  | Single post + its comments            |
| POST   | /api/posts                      | yes  | Create post                           |
| DELETE | /api/posts/:id                  | yes  | Delete own post                       |
| POST   | /api/posts/:id/like             | yes  | Toggle like                           |
| POST   | /api/posts/:id/comments         | yes  | Add comment                           |
| DELETE | /api/comments/:id               | yes  | Delete own comment                    |

Every endpoint above was hit with real requests end-to-end (register both users,
post, follow, like, comment, delete-permission checks) before this was handed off —
not just eyeballed.

## What's deliberately left out (scope cuts for the deadline)

- No image upload — post/avatar images are just pasted URLs, not file uploads.
- No pagination — feed caps at 50 posts. Fine for a demo, not for a real product.
- No password reset / email verification.
- No rate limiting on likes/comments — someone could spam-click. Don't ship this to
  production as-is; it's a functional internship demo, not a hardened app.
- SQLite is file-based and fine for one server instance. It is not what you'd reach
  for if this needed to scale to multiple servers or heavy concurrent writes — that's
  the tradeoff you're making by avoiding MongoDB here, and it's the right one for a
  single-machine internship demo.
