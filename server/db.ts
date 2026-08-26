import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  comments,
  follows,
  hashtags,
  likes,
  postHashtags,
  posts,
  profiles,
  type InsertUser,
  type User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("The database is not available.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export function normalizeHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);
}

export async function ensureProfile(user: User) {
  const db = await requireDb();
  const found = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (found[0]) return found[0];

  const preferred = normalizeHandle(user.name || user.email?.split("@")[0] || "furrio") || "furrio";
  const handle = `${preferred.slice(0, 25)}${user.id}`;
  await db.insert(profiles).values({
    userId: user.id,
    handle,
    displayName: (user.name || "New Furrio member").slice(0, 80),
    bio: "New to the Furrio community.",
  });
  const created = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return created[0]!;
}

export async function getPostCards(viewerId?: number, authorId?: number, limit = 24, selectedTag?: string) {
  const db = await requireDb();
  const rows = selectedTag
    ? await db
        .select({ post: posts, profile: profiles })
        .from(posts)
        .innerJoin(profiles, eq(posts.authorId, profiles.userId))
        .innerJoin(postHashtags, eq(posts.id, postHashtags.postId))
        .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
        .where(eq(hashtags.name, selectedTag))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
    : authorId
      ? await db
          .select({ post: posts, profile: profiles })
          .from(posts)
          .innerJoin(profiles, eq(posts.authorId, profiles.userId))
          .where(eq(posts.authorId, authorId))
          .orderBy(desc(posts.createdAt))
          .limit(limit)
      : await db
          .select({ post: posts, profile: profiles })
          .from(posts)
          .innerJoin(profiles, eq(posts.authorId, profiles.userId))
          .orderBy(desc(posts.createdAt))
          .limit(limit);
  if (!rows.length) return [];

  const ids = rows.map(row => row.post.id);
  const [likeRows, commentRows, tagRows, viewerLikeRows] = await Promise.all([
    db
      .select({ postId: likes.postId, count: sql<number>`count(*)` })
      .from(likes)
      .where(inArray(likes.postId, ids))
      .groupBy(likes.postId),
    db
      .select({ postId: comments.postId, count: sql<number>`count(*)` })
      .from(comments)
      .where(inArray(comments.postId, ids))
      .groupBy(comments.postId),
    db
      .select({ postId: postHashtags.postId, tag: hashtags.name })
      .from(postHashtags)
      .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .where(inArray(postHashtags.postId, ids)),
    viewerId
      ? db.select({ postId: likes.postId }).from(likes).where(and(eq(likes.userId, viewerId), inArray(likes.postId, ids)))
      : Promise.resolve([]),
  ]);
  const likeCounts = new Map(likeRows.map(row => [row.postId, Number(row.count)]));
  const commentCounts = new Map(commentRows.map(row => [row.postId, Number(row.count)]));
  const tagsByPost = new Map<number, string[]>();
  tagRows.forEach(row => tagsByPost.set(row.postId, [...(tagsByPost.get(row.postId) || []), row.tag]));
  const likedByViewer = new Set(viewerLikeRows.map(row => row.postId));

  return rows.map(({ post, profile }) => ({
    ...post,
    tags: tagsByPost.get(post.id) || [],
    likeCount: likeCounts.get(post.id) || 0,
    commentCount: commentCounts.get(post.id) || 0,
    likedByViewer: likedByViewer.has(post.id),
    author: profile,
  }));
}

export async function getPostComments(postId: number) {
  const db = await requireDb();
  return db
    .select({ comment: comments, profile: profiles })
    .from(comments)
    .innerJoin(profiles, eq(comments.authorId, profiles.userId))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt))
    .limit(50);
}

export async function getCreatorCards(viewerId?: number, limit = 8) {
  const db = await requireDb();
  const creatorRows = await db.select().from(profiles).orderBy(desc(profiles.updatedAt)).limit(limit);
  if (!creatorRows.length) return [];
  const ids = creatorRows.map(profile => profile.userId);
  const [followerRows, postRows, viewerFollowRows] = await Promise.all([
    db
      .select({ userId: follows.followingId, count: sql<number>`count(*)` })
      .from(follows)
      .where(inArray(follows.followingId, ids))
      .groupBy(follows.followingId),
    db
      .select({ userId: posts.authorId, count: sql<number>`count(*)` })
      .from(posts)
      .where(inArray(posts.authorId, ids))
      .groupBy(posts.authorId),
    viewerId
      ? db.select({ userId: follows.followingId }).from(follows).where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, ids)))
      : Promise.resolve([]),
  ]);
  const followers = new Map(followerRows.map(row => [row.userId, Number(row.count)]));
  const postsByUser = new Map(postRows.map(row => [row.userId, Number(row.count)]));
  const following = new Set(viewerFollowRows.map(row => row.userId));
  return creatorRows.map(profile => ({
    ...profile,
    followerCount: followers.get(profile.userId) || 0,
    postCount: postsByUser.get(profile.userId) || 0,
    followedByViewer: following.has(profile.userId),
  }));
}

export async function getTrendingTags(limit = 10) {
  const db = await requireDb();
  return db
    .select({ name: hashtags.name, postCount: sql<number>`count(*)` })
    .from(postHashtags)
    .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
    .groupBy(hashtags.id, hashtags.name)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);
}
