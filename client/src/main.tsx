import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import superjson from "superjson";
import App from "./App";
import { getAuth0RedirectOrigin } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AuthenticatedApp() {
  const { error, getIdTokenClaims, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setLoadingTooLong(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadingTooLong(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    // Auth0 consumes valid `code` + `state` callbacks itself. If a failed or
    // interrupted attempt leaves only `state` in the address bar, remove it
    // once initialization has settled so the app does not keep looking like a
    // callback page on refresh.
    if (!isLoading) {
      const url = new URL(window.location.href);
      const hasCode = url.searchParams.has("code");
      const hasStaleAuthParams = url.searchParams.has("state") || url.searchParams.has("error");
      if (!hasCode && hasStaleAuthParams) {
        window.history.replaceState({}, document.title, url.pathname + url.hash);
      }
    }
  }, [error, isLoading]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const hint = new URLSearchParams(window.location.search).get("furrio_auth");
    if (hint !== "login" && hint !== "signup") return;
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    void loginWithRedirect({ authorizationParams: { screen_hint: hint } });
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  const trpcClient = useMemo(
    () => trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          headers: async () => {
            if (!isAuthenticated) return {};
            try {
              const identityClaims = await getIdTokenClaims();
              if (!identityClaims?.__raw) return {};
              return {
                Authorization: `Bearer ${identityClaims.__raw}`,
                "X-Furrio-Identity": identityClaims.__raw,
              };
            } catch {
              // Public procedures should remain usable when Auth0 needs a fresh session.
              // Protected procedures will return their normal UNAUTHORIZED error.
              return {};
            }
          },
          fetch(input, init) {
            return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
          },
        }),
      ],
    }),
    [getIdTokenClaims, isAuthenticated],
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
      redirect_uri: getAuth0RedirectOrigin(),
      scope: "openid profile email",
    }}
  >
    <AuthenticatedApp />
  </Auth0Provider>,
);
