import { describe, expect, it } from "vitest";
import { normalizeAuthEmail } from "./db";

describe("Auth0 identity consolidation", () => {
  it("normalizes email addresses before matching provider identities", () => {
    expect(normalizeAuthEmail("  D3RY@Example.COM ")).toBe("d3ry@example.com");
  });

  it("does not create an email link from an empty claim", () => {
    expect(normalizeAuthEmail("   ")).toBeNull();
    expect(normalizeAuthEmail(null)).toBeNull();
  });
});
