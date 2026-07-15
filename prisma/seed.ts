import { PrismaClient, Visibility } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PEOPLE: [string, string][] = [
  ["Demo", "User"],
  ["Karim", "Saif"],
  ["Radovan", "Skill"],
  ["Steve", "Jobs"],
  ["Ryan", "Roslansky"],
  ["Dylan", "Field"],
  ["Ada", "Lovelace"],
  ["Grace", "Hopper"],
];

const IMAGES = [
  "/assets/images/timeline_img.png",
  "/assets/images/post_img.png",
  "/assets/images/img8.png",
  "/assets/images/photos3.png",
];

const POSTS = [
  "Just shipped a new feature after a long week. Feels good to see it live.",
  "Healthy Tracking App — early prototype is finally coming together.",
  "Reading about database indexing today. Keyset pagination is underrated.",
  "Weekend hike was exactly the reset I needed.",
  "Hot take: small, focused pull requests beat giant ones every time.",
  "Coffee, code, repeat. What's everyone building this week?",
  "Design systems save so much time once they click.",
  "A quiet evening with a good book and no notifications.",
];

const COMMENTS = [
  "This is great, congrats!",
  "Love the direction here.",
  "Totally agree with this.",
  "How did you handle the edge cases?",
  "Saving this for later.",
];

const REPLIES = ["Thanks so much!", "Good point.", "Exactly what I was thinking.", "Appreciate it."];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function main() {
  await prisma.commentLike.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);
  const users = [];
  for (const [firstName, lastName] of PEOPLE) {
    users.push(
      await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: `${firstName}.${lastName}@example.com`.toLowerCase(),
          passwordHash,
        },
      }),
    );
  }

  let order = 0;
  for (let p = 0; p < 40; p++) {
    const author = pick(users);
    const createdAt = new Date(Date.now() - order * 37 * 60 * 1000);
    order += 1;

    const likers = sample(users, Math.floor(Math.random() * users.length));
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        content: pick(POSTS),
        imageUrl: Math.random() < 0.4 ? pick(IMAGES) : null,
        visibility: Math.random() < 0.25 ? Visibility.PRIVATE : Visibility.PUBLIC,
        createdAt,
        likeCount: likers.length,
      },
    });
    if (likers.length) {
      await prisma.postLike.createMany({ data: likers.map((u) => ({ postId: post.id, userId: u.id })) });
    }

    let commentTotal = 0;
    for (let c = 0; c < Math.floor(Math.random() * 4); c++) {
      const commentLikers = sample(users, Math.floor(Math.random() * 4));
      const comment = await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: pick(users).id,
          content: pick(COMMENTS),
          likeCount: commentLikers.length,
          createdAt: new Date(createdAt.getTime() + (c + 1) * 60_000),
        },
      });
      if (commentLikers.length) {
        await prisma.commentLike.createMany({
          data: commentLikers.map((u) => ({ commentId: comment.id, userId: u.id })),
        });
      }
      commentTotal += 1;

      const replyCount = Math.floor(Math.random() * 3);
      for (let r = 0; r < replyCount; r++) {
        const replyLikers = sample(users, Math.floor(Math.random() * 3));
        const reply = await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: pick(users).id,
            parentId: comment.id,
            content: pick(REPLIES),
            likeCount: replyLikers.length,
            createdAt: new Date(comment.createdAt.getTime() + (r + 1) * 30_000),
          },
        });
        if (replyLikers.length) {
          await prisma.commentLike.createMany({
            data: replyLikers.map((u) => ({ commentId: reply.id, userId: u.id })),
          });
        }
        commentTotal += 1;
      }
      if (replyCount) {
        await prisma.comment.update({ where: { id: comment.id }, data: { replyCount } });
      }
    }
    if (commentTotal) {
      await prisma.post.update({ where: { id: post.id }, data: { commentCount: commentTotal } });
    }
  }

  console.log(`Seeded ${users.length} users and 40 posts. Login with demo.user@example.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
