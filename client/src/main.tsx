import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { useMemo } from "react";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { getAccessTokenSilently, getIdTokenClaims, isAuthenticated } = useAuth0();
  const trpcClient = useMemo(
    () => trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          headers: async () => {
            if (!isAuthenticated) return {};
            const [accessToken, identityClaims] = await Promise.all([
              getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }),
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
    authorizationParams={{ redirect_uri: window.location.origin }}
  >
    <AuthenticatedApp />
  </Auth0Provider>,
);
