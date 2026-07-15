# Buddy Script - Social Feed

A social feed built from the provided "Buddy Script" HTML/CSS template: authentication,
a protected feed, posts with text and images, public/private visibility, and likes and
comments with replies.

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL + Prisma · JWT in httpOnly
cookies · AWS S3 · TanStack Query.

## Setup

Requires Node 20+, Docker, and an AWS S3 bucket.

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://localhost:3000 and log in:

```
Email:    demo.user@example.com
Password: password123
```

Every seeded user has the password `password123` (`karim.saif@example.com`,
`ada.lovelace@example.com`, …), which is useful for checking that private posts stay
private between two accounts.


## Environment

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL`
- `JWT_SECRET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_PUBLIC_BASE_URL`

`npm run db:studio` opens Prisma Studio if you want to poke at the data.

## What's built

**Auth.** Register with first name, last name, email, password. Passwords are hashed with
bcrypt (cost 12). The session is a JWT in an httpOnly, SameSite=Lax cookie - never
readable from JS. `src/proxy.ts` redirects logged-out visitors to `/login` and logged-in
ones away from the auth pages; every API route re-checks the session independently,
because the proxy only guards navigation.

**Feed.** `/feed` lists posts newest-first with infinite scroll. Public posts are visible
to everyone, private posts only to their author - enforced in the query, not the UI.
Authors can edit and delete their own posts and comments.

**Images.** The client asks `/api/uploads/presign` for a short-lived (60s) upload URL,
`PUT`s the file directly to S3, then sends the resulting public URL with the post. Bytes
never pass through the app server. Uploads are capped at 5MB and limited to JPEG, PNG,
WebP, and GIF.

**Likes and comments.** Posts, comments, and replies each have their own like toggle with
a "who liked this" list. Comments thread one level deep.


## Decisions

**Everything inside Next.js.** The API routes live in the same app as the pages that call
them, so there's one codebase, one deploy, and one set of types and session helpers shared
by both sides. A separate backend would mean a second service to run.

**Postgres.** The data is relational: users have posts, posts have comments, comments have
replies, and likes join users to both. That's what a relational database is for.

**S3.** S3 stores files cheaply and best suitable for an app with millions of users.

**Like state in one query per page.** The current user's likes for a whole page are fetched
as a single `IN` query rather than per-post, avoiding an N+1.


**The template's emoji reactions are a single like toggle.** The spec asks for like/unlike,
so the decorative reaction set is wired as one binary action.

**Left as static design.** Search, notifications, stories, friend requests, Share, and the
Video/Event/Article composer buttons are template UI with no backend.
