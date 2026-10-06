# Auth0 Setup for Furrio

Furrio uses an **Auth0 Single Page Web Application** for persistent browser sessions and a dedicated **Furrio API** audience for protected social requests. The browser receives an Auth0 access token for the Furrio API and an ID token for member identity; the server verifies both against the Auth0 tenant’s OpenID Connect keys before allowing protected actions.

| Setting | Current preview value | Production value |
|---|---|---|
| Application type | Single Page Web Application | Single Page Web Application |
| Allowed Callback URLs | `https://3000-itqxi3se9fynvgle8pdrv-35966b9e.us1.manus.computer` | Add the published Furrio origin, without a trailing slash. |
| Allowed Logout URLs | `https://3000-itqxi3se9fynvgle8pdrv-35966b9e.us1.manus.computer` | Add the published Furrio origin, without a trailing slash. |
| Allowed Web Origins | `https://3000-itqxi3se9fynvgle8pdrv-35966b9e.us1.manus.computer` | Add the published Furrio origin, without a trailing slash. |
| API Identifier | `https://api.furrio.app` | Keep this identifier stable. |

> **Do not use** Auth0’s Management API identifier (`https://YOUR_TENANT.auth0.com/api/v2/`) as the Furrio browser audience. It grants management-oriented access and is not the dedicated API Furrio uses for community actions.

In the Auth0 Dashboard, enable **Username-Password-Authentication**, **Google**, and **Apple** for the Furrio SPA. Auth0 sends a verification email for new database-account registrations by default. Furrio’s server additionally rejects protected activity from an `auth0|…` database identity until the verified-email claim is present, while returning verified members can sign in normally without a fresh verification request. Social identities are handled through Auth0’s connection flows.

Furrio sends both **Sign in** and **Join Furrio** actions directly to Auth0 Universal Login. This keeps email/password, Google, and Apple in one secure Auth0 screen rather than showing a second Furrio login form first. Customize the Universal Login branding in the Auth0 Dashboard to match Furrio’s colors and logo.

> Preview hosts can change after a sandbox or preview environment reset. Keep both the current preview origin and any still-used previous preview origin in the Auth0 URL lists, or use the published Furrio origin for a stable production callback.

For the Google connection, configure its OAuth credentials and Auth0 callback in the Google Cloud console. For Apple, configure the Service ID, Team ID, Key ID, private key, and Auth0 callback in the Auth0 Apple connection settings. These provider secrets stay in the respective provider and Auth0 dashboards; they are not stored in Furrio.

## References

[1] [Auth0 React SPA quickstart](https://auth0.com/docs/quickstart/spa/react)

[2] [Auth0 email verification](https://auth0.com/docs/manage-users/user-accounts/verify-emails)

[3] [Auth0 Google social connection](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/google)
