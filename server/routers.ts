import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { comments, follows, hashtags, likes, postHashtags, posts, profiles } from "../drizzle/schema";
import {
  ensureProfile,
  getCreatorCards,
  getPostCards,
  getPostComments,
  getTrendingTags,
  normalizeHandle,
  requireDb,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";

const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,32}$/, "Use 3–32 lowercase letters, numbers, or underscores.");

const profileInput = z.object({
  displayName: z.string().trim().min(1).max(80),
  handle: handleSchema,
  fursonaName: z.string().trim().max(80).nullable(),
  bio: z.string().trim().max(500).nullable(),
  isCreator: z.boolean(),
  avatarUrl: z.string().max(500).nullable(),
  avatarKey: z.string().max(255).nullable(),
});

function extractHashtags(caption: string) {
  return Array.from(new Set(Array.from(caption.matchAll(/(?:^|\s)#([a-zA-Z0-9_]{2,40})/g), match => match[1].toLowerCase()))).slice(0, 8);
}

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a PNG, JPEG, or WebP image." });
  const data = Buffer.from(match[2], "base64");
  if (data.length === 0 || data.length > 4 * 1024 * 1024) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Images must be smaller than 4 MB." });
  }
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].slice("image/".length);
  return { data, contentType: match[1], extension };
}

export function ownsMediaKey(userId: number, purpose: "avatar" | "post", key: string) {
  return key.startsWith(`furrio/${userId}/${purpose}/`);
}

async function requirePostTarget(postId: number) {
  const db = await requireDb();
  const target = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "That post is no longer available." });
  return db;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  media: router({
    uploadImage: protectedProcedure
      .input(z.object({ dataUrl: z.string().max(6_000_000), purpose: z.enum(["avatar", "post"]) }))
      .mutation(async ({ ctx, input }) => {
        const image = parseImageDataUrl(input.dataUrl);
        const key = `furrio/${ctx.user.id}/${input.purpose}/${nanoid()}.${image.extension}`;
        const uploaded = await storagePut(key, image.data, image.contentType);
        return { key: uploaded.key, url: uploaded.url };
      }),
  }),
  social: router({
    bootstrap: protectedProcedure.query(async ({ ctx }) => ({ profile: await ensureProfile(ctx.user) })),
    home: publicProcedure.query(async ({ ctx }) => ({ posts: await getPostCards(ctx.user?.id), creators: await getCreatorCards(ctx.user?.id, 5) })),
    explore: publicProcedure.query(async ({ ctx }) => ({
      posts: await getPostCards(ctx.user?.id, undefined, 18),
      tags: await getTrendingTags(12),
      creators: await getCreatorCards(ctx.user?.id, 8),
    })),
    hashtag: publicProcedure.input(z.object({ name: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{2,40}$/) })).query(async ({ ctx, input }) => ({
      name: input.name,
      posts: await getPostCards(ctx.user?.id, undefined, 24, input.name),
    })),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const profile = await ensureProfile(ctx.user);
      const db = await requireDb();
      const [followerRow, followingRow] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followingId, ctx.user.id)),
        db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followerId, ctx.user.id)),
      ]);
      return {
        profile,
        posts: await getPostCards(ctx.user.id, ctx.user.id),
        followerCount: Number(followerRow[0]?.count || 0),
        followingCount: Number(followingRow[0]?.count || 0),
      };
    }),
    profile: publicProcedure.input(z.object({ handle: z.string().trim().toLowerCase() })).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const profile = await db.select().from(profiles).where(eq(profiles.handle, input.handle)).limit(1);
      if (!profile[0]) throw new TRPCError({ code: "NOT_FOUND", message: "This profile is not available." });
      const target = profile[0];
      const [followerRow, followingRow, viewerFollow] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followingId, target.userId)),
        db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followerId, target.userId)),
        ctx.user
          ? db.select().from(follows).where(and(eq(follows.followerId, ctx.user.id), eq(follows.followingId, target.userId))).limit(1)
          : Promise.resolve([]),
      ]);
      return {
        profile: target,
        posts: await getPostCards(ctx.user?.id, target.userId),
        followerCount: Number(followerRow[0]?.count || 0),
        followingCount: Number(followingRow[0]?.count || 0),
        followedByViewer: Boolean(viewerFollow[0]),
      };
    }),
    updateProfile: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await ensureProfile(ctx.user);
      const handle = normalizeHandle(input.handle);
      const handleOwner = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.handle, handle)).limit(1);
      if (handleOwner[0] && handleOwner[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "That handle is already taken." });
      }
      if (input.avatarKey && !ownsMediaKey(ctx.user.id, "avatar", input.avatarKey)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Use an avatar uploaded from your own account." });
      }
      await db.update(profiles).set({ ...input, handle }).where(eq(profiles.userId, ctx.user.id));
      const saved = await db.select().from(profiles).where(eq(profiles.userId, ctx.user.id)).limit(1);
      return saved[0]!;
    }),
    createPost: protectedProcedure
      .input(z.object({ imageUrl: z.string().min(1).max(500), imageKey: z.string().min(1).max(255), caption: z.string().trim().max(2_000) }))
      .mutation(async ({ ctx, input }) => {
        if (!ownsMediaKey(ctx.user.id, "post", input.imageKey)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Use an image uploaded from your own account." });
        }
        const db = await requireDb();
        await ensureProfile(ctx.user);
        const created = await db.insert(posts).values({ authorId: ctx.user.id, imageUrl: input.imageUrl, imageKey: input.imageKey, caption: input.caption || null });
        const postId = Number(created[0].insertId);
        const tagNames = extractHashtags(input.caption);
        for (const tagName of tagNames) {
          await db.insert(hashtags).values({ name: tagName }).onDuplicateKeyUpdate({ set: { name: tagName } });
          const tag = await db.select({ id: hashtags.id }).from(hashtags).where(eq(hashtags.name, tagName)).limit(1);
          if (tag[0]) await db.insert(postHashtags).values({ postId, hashtagId: tag[0].id }).onDuplicateKeyUpdate({ set: { postId } });
        }
        return { postId };
      }),
    toggleLike: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requirePostTarget(input.postId);
      const existing = await db.select().from(likes).where(and(eq(likes.userId, ctx.user.id), eq(likes.postId, input.postId))).limit(1);
      if (existing[0]) {
        await db.delete(likes).where(and(eq(likes.userId, ctx.user.id), eq(likes.postId, input.postId)));
        return { liked: false };
      }
      await db.insert(likes).values({ userId: ctx.user.id, postId: input.postId });
      return { liked: true };
    }),
    comments: publicProcedure.input(z.object({ postId: z.number().int().positive() })).query(({ input }) => getPostComments(input.postId)),
    addComment: protectedProcedure.input(z.object({ postId: z.number().int().positive(), body: z.string().trim().min(1).max(1_000) })).mutation(async ({ ctx, input }) => {
      const db = await requirePostTarget(input.postId);
      await db.insert(comments).values({ postId: input.postId, authorId: ctx.user.id, body: input.body });
      return { success: true };
    }),
    toggleFollow: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot follow yourself." });
      const db = await requireDb();
      const target = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.userId, input.userId)).limit(1);
      if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "This member is not available." });
      const existing = await db.select().from(follows).where(and(eq(follows.followerId, ctx.user.id), eq(follows.followingId, input.userId))).limit(1);
      if (existing[0]) {
        await db.delete(follows).where(and(eq(follows.followerId, ctx.user.id), eq(follows.followingId, input.userId)));
        return { following: false };
      }
      await db.insert(follows).values({ followerId: ctx.user.id, followingId: input.userId });
      return { following: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
