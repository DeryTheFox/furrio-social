import { describe, expect, it } from "vitest";
import { ownsMediaKey } from "./routers";

const extractHashtags = (caption: string) =>
  Array.from(new Set(Array.from(caption.matchAll(/(?:^|\s)#([a-zA-Z0-9_]{2,40})/g), match => match[1].toLowerCase()))).slice(0, 8);

const normalizeHandle = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32);

describe("Furrio social rules", () => {
  it("normalizes creator handles to a safe public identifier", () => {
    expect(normalizeHandle("  Moon-Paw!  ")).toBe("moonpaw");
  });

  it("extracts unique normalized hashtags and caps discovery metadata", () => {
    const tags = extractHashtags("Meet #Furrio #Art and #furrio with #DigitalArt");
    expect(tags).toEqual(["furrio", "art", "digitalart"]);
  });

  it("only accepts a post or avatar key belonging to the current member", () => {
    expect(ownsMediaKey(42, "post", "furrio/42/post/creation.webp")).toBe(true);
    expect(ownsMediaKey(42, "avatar", "furrio/42/avatar/profile.png")).toBe(true);
    expect(ownsMediaKey(42, "post", "furrio/9/post/not-owned.webp")).toBe(false);
    expect(ownsMediaKey(42, "post", "furrio/42/avatar/not-a-post.webp")).toBe(false);
  });
});
