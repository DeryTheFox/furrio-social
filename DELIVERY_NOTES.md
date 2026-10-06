# Furrio Delivery Notes

## Delivered

Furrio is a full-stack social platform for the furry community with:

- Home feed, Explore discovery, and Profile sections.
- Creator profiles with display name, handle, fursona name, bio, avatar, and creator status.
- Image posts, likes, comments, follows, hashtags, and creator discovery.
- S3-compatible media storage with ownership validation.
- Auth0 authentication for email/password, Google, and Apple.
- A single Auth0 Universal Login screen for sign-in and signup; Furrio no longer shows a separate login form before Auth0.
- Persistent Auth0 browser sessions and callback error handling.

## Authentication setup

Configure the Auth0 SPA with the current Furrio preview origin in **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**. The exact values are documented in [AUTH0_SETUP.md](./AUTH0_SETUP.md).

Enable these Auth0 connections for the application:

- Username-Password-Authentication
- Google
- Apple

New database accounts must verify their email before protected Furrio activity. Returning verified users can sign in without repeating verification.

## Verification status

Completed locally:

- TypeScript validation.
- Production frontend and backend build.
- 15 Vitest tests covering authentication configuration, social rules, interactions, and media ownership.
- Live preview render and browser-console verification.

Still requiring interactive account testing:

- New email/password signup and email verification.
- Returning email/password sign-in.
- Google sign-in.
- Apple sign-in.

These checks require the project owner’s provider accounts and should be performed from the Furrio preview after the Auth0 dashboard settings are saved.

## Checkpoint

The current saved project checkpoint is `f15b3558`, containing the direct Auth0 Universal Login integration and persistent-session fixes.

## Development commands

```bash
pnpm check
pnpm build
pnpm test
```
