import { describe, expect, it } from "vitest";

describe("Auth0 client configuration", () => {
  it("exposes a non-empty SPA client identifier when Auth0 is configured", () => {
    const clientId = process.env.VITE_AUTH0_CLIENT_ID;
    expect(clientId).toBeTruthy();
    expect(clientId).toMatch(/^[A-Za-z0-9_-]{16,}$/);
  });

  it("publishes a reachable OpenID Connect discovery document for the configured tenant", async () => {
    const domain = process.env.VITE_AUTH0_DOMAIN;
    expect(domain).toMatch(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+\.auth0\.com$/i);

    const response = await fetch(`https://${domain}/.well-known/openid-configuration`);
    expect(response.ok).toBe(true);
    const document = await response.json() as { issuer?: string; authorization_endpoint?: string };
    expect(document.issuer).toBe(`https://${domain}/`);
    expect(document.authorization_endpoint).toContain(`https://${domain}/authorize`);
  }, 15_000);

  it("does not use the Auth0 Management API as an application audience", () => {
    const audience = process.env.VITE_AUTH0_AUDIENCE;
    if (audience) expect(audience).not.toContain("/api/v2/");
  });
});
