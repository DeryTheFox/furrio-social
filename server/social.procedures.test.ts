import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  ensureProfile: vi.fn(),
  getCreatorCards: vi.fn(),
  getPostCards: vi.fn(),
  getPostComments: vi.fn(),
  getTrendingTags: vi.fn(),
  normalizeHandle: (value: string) => value,
  requireDb: vi.fn(),
}));

import { requireDb } from "./db";
import { appRouter } from "./routers";

type FakeDb = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function createContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "furrio-test-member",
      name: "Furrio Tester",
      email: "tester@furrio.example",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createFakeDb(selectResults: unknown[][]): FakeDb {
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => selectResults.shift() || []),
      })),
    })),
  }));
  const insert = vi.fn(() => ({ values: vi.fn(async () => []) }));
  const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) }));
  const remove = vi.fn(() => ({ where: vi.fn(async () => []) }));
  return { select, insert, update, delete: remove };
}

describe("Furrio social procedures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects likes and comments for a post that no longer exists", async () => {
    const db = createFakeDb([[]]);
    vi.mocked(requireDb).mockResolvedValue(db as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.social.toggleLike({ postId: 88 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.insert).not.toHaveBeenCalled();

    vi.mocked(requireDb).mockResolvedValue(createFakeDb([[]]) as never);
    await expect(caller.social.addComment({ postId: 88, body: "Lovely work" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a like when the target exists and the member has not liked it", async () => {
    const db = createFakeDb([[{ id: 23 }], []]);
    vi.mocked(requireDb).mockResolvedValue(db as never);

    const result = await appRouter.createCaller(createContext()).social.toggleLike({ postId: 23 });

    expect(result).toEqual({ liked: true });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("removes the persisted like when the member has already liked the post", async () => {
    const db = createFakeDb([[{ id: 23 }], [{ userId: 7, postId: 23 }]]);
    vi.mocked(requireDb).mockResolvedValue(db as never);

    const result = await appRouter.createCaller(createContext()).social.toggleLike({ postId: 23 });

    expect(result).toEqual({ liked: false });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("creates a comment only after verifying the post target", async () => {
    const db = createFakeDb([[{ id: 41 }]]);
    vi.mocked(requireDb).mockResolvedValue(db as never);

    await expect(appRouter.createCaller(createContext()).social.addComment({ postId: 41, body: "The colors are wonderful." })).resolves.toEqual({ success: true });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("creates a follow relationship for an available non-self profile", async () => {
    const db = createFakeDb([[{ userId: 19 }], []]);
    vi.mocked(requireDb).mockResolvedValue(db as never);

    await expect(appRouter.createCaller(createContext()).social.toggleFollow({ userId: 19 })).resolves.toEqual({ following: true });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("removes an existing follow relationship when a member unfollows", async () => {
    const db = createFakeDb([[{ userId: 19 }], [{ followerId: 7, followingId: 19 }]]);
    vi.mocked(requireDb).mockResolvedValue(db as never);

    await expect(appRouter.createCaller(createContext()).social.toggleFollow({ userId: 19 })).resolves.toEqual({ following: false });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("does not permit a member to follow themself", async () => {
    await expect(appRouter.createCaller(createContext()).social.toggleFollow({ userId: 7 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a profile update when the requested public handle belongs to another member", async () => {
    const db = createFakeDb([[{ userId: 19 }]]);
    vi.mocked(requireDb).mockResolvedValue(db as never);

    await expect(appRouter.createCaller(createContext()).social.updateProfile({
      displayName: "Furrio Tester",
      handle: "taken_handle",
      fursonaName: null,
      bio: null,
      isCreator: true,
      avatarUrl: null,
      avatarKey: null,
    })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("persists a valid public identity update with a member-owned avatar key", async () => {
    const savedProfile = {
      userId: 7,
      handle: "furrio_tester",
      displayName: "Furrio Tester",
      fursonaName: "Amber",
      bio: "Making bright things.",
      avatarUrl: "/manus-storage/furrio/7/avatar/refreshed.png",
      avatarKey: "furrio/7/avatar/refreshed.png",
      isCreator: true,
    };
    const db = createFakeDb([[], [savedProfile]]);
    vi.mocked(requireDb).mockResolvedValue(db as never);

    await expect(appRouter.createCaller(createContext()).social.updateProfile({
      displayName: "Furrio Tester",
      handle: "furrio_tester",
      fursonaName: "Amber",
      bio: "Making bright things.",
      isCreator: true,
      avatarUrl: "/manus-storage/furrio/7/avatar/refreshed.png",
      avatarKey: "furrio/7/avatar/refreshed.png",
    })).resolves.toEqual(savedProfile);
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
