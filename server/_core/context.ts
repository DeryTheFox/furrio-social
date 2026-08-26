import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

let auth0Jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function authenticateAuth0Request(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const domain = process.env.VITE_AUTH0_DOMAIN;
  const clientId = process.env.VITE_AUTH0_CLIENT_ID;
  const audience = process.env.VITE_AUTH0_AUDIENCE;
  if (!token || !domain || !clientId || !audience) return null;

  try {
    const issuer = `https://${domain}/`;
    auth0Jwks ??= createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
    const accessResult = await jwtVerify(token, auth0Jwks, { issuer, audience });
    const rawIdentity = req.headers["x-furrio-identity"];
    const identityToken = typeof rawIdentity === "string" ? rawIdentity : null;
    if (!identityToken) return null;
    const identityResult = await jwtVerify(identityToken, auth0Jwks, { issuer, audience: clientId });
    const subject = typeof identityResult.payload.sub === "string" ? identityResult.payload.sub : "";
    if (accessResult.payload.sub !== subject) return null;
    if (!subject) return null;

    // Auth0 database credentials identify with `auth0|...`. Those new accounts
    // must verify their email before accessing protected community actions;
    // subsequent verified sessions do not trigger a new verification flow.
    if (subject.startsWith("auth0|") && identityResult.payload.email_verified !== true) return null;

    await upsertUser({
      openId: subject,
      name: typeof identityResult.payload.name === "string" ? identityResult.payload.name : null,
      email: typeof identityResult.payload.email === "string" ? identityResult.payload.email : null,
      loginMethod: subject.split("|")[0] || "auth0",
      lastSignedIn: new Date(),
    });
    return (await getUserByOpenId(subject)) ?? null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateAuth0Request(opts.req);
    if (!user) user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
