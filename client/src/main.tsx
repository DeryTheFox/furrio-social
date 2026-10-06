import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { error, getAccessTokenSilently, getIdTokenClaims, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setLoadingTooLong(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadingTooLong(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);
  const trpcClient = useMemo(
    () => trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          headers: async () => {
            if (!isAuthenticated) return {};
            const [accessToken, identityClaims] = await Promise.all([
              getAccessTokenSilently({
                authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
                cacheMode: "off",
              }),
              getIdTokenClaims(),
            ]);
            return {
              Authorization: `Bearer ${accessToken}`,
              ...(identityClaims?.__raw ? { "X-Furrio-Identity": identityClaims.__raw } : {}),
            };
          },
          fetch(input, init) {
            return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
          },
        }),
      ],
    }),
    [getAccessTokenSilently, getIdTokenClaims, isAuthenticated],
  );

  if (error || loadingTooLong) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f7f5f1", color: "#2b2825", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 42, marginBottom: 12 }}>Furrio could not finish signing you in.</h1>
        <p style={{ lineHeight: 1.6, color: "#706a63", marginBottom: 24 }}>{error?.message || "The sign-in session took longer than expected. Please try the Google sign-in again."}</p>
        <button onClick={() => loginWithRedirect()} style={{ border: 0, borderRadius: 999, padding: "12px 20px", background: "#282521", color: "white", fontWeight: 700, cursor: "pointer" }}>Try sign-in again</button>
      </section>
    </main>;
  }

  return <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>;
}

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

createRoot(document.getElementById("root")!).render(
  <Auth0Provider
    domain={auth0Domain}
    clientId={auth0ClientId}
    cacheLocation="localstorage"
    onRedirectCallback={() => {
      window.history.replaceState({}, document.title, window.location.pathname);
    }}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      scope: "openid profile email",
    }}
  >
    <AuthenticatedApp />
  </Auth0Provider>,
);
