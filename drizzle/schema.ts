import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userIdentities = mysqlTable(
  "userIdentities",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerSubject: varchar("providerSubject", { length: 255 }).notNull().unique(),
    provider: varchar("provider", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("userIdentities_user_idx").on(table.userId)],
);

export const profiles = mysqlTable(
  "profiles",
  {
    userId: int("userId")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: varchar("handle", { length: 40 }).notNull().unique(),
    displayName: varchar("displayName", { length: 80 }).notNull(),
    fursonaName: varchar("fursonaName", { length: 80 }),
    bio: text("bio"),
    avatarUrl: text("avatarUrl"),
    avatarKey: varchar("avatarKey", { length: 255 }),
    isCreator: boolean("isCreator").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("profiles_handle_idx").on(table.handle)],
);

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    authorId: int("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaType: mysqlEnum("mediaType", ["text", "image", "video"]).default("text").notNull(),
    imageUrl: text("imageUrl"),
    imageKey: varchar("imageKey", { length: 255 }),
    caption: text("caption"),
    visibility: mysqlEnum("visibility", ["public"]).default("public").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("posts_author_created_idx").on(table.authorId, table.createdAt)],
);

export const hashtags = mysqlTable("hashtags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const postHashtags = mysqlTable(
  "postHashtags",
  {
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    hashtagId: int("hashtagId")
      .notNull()
      .references(() => hashtags.id, { onDelete: "cascade" }),
  },
  table => [primaryKey({ columns: [table.postId, table.hashtagId] })],
);

export const likes = mysqlTable(
  "likes",
  {
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.userId, table.postId] }), index("likes_post_idx").on(table.postId)],
);

export const comments = mysqlTable(
  "comments",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: int("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: varchar("body", { length: 1_000 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("comments_post_created_idx").on(table.postId, table.createdAt)],
);

export const follows = mysqlTable(
  "follows",
  {
    followerId: int("followerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: int("followingId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follows_following_idx").on(table.followingId),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
