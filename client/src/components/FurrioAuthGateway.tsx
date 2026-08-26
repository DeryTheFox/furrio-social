import { useAuth0 } from "@auth0/auth0-react";
import { ArrowUpRight, Mail, PawPrint, ShieldCheck, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type AuthMode = "login" | "signup";

export default function FurrioAuthGateway() {
  const { loginWithRedirect } = useAuth0();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const openGateway = (event: Event) => {
      const requested = (event as CustomEvent<AuthMode>).detail;
      setMode(requested === "signup" ? "signup" : "login");
      setEmail("");
      setOpen(true);
    };
    window.addEventListener("furrio-auth", openGateway);
    return () => window.removeEventListener("furrio-auth", openGateway);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    loginWithRedirect({
      authorizationParams: {
        screen_hint: mode,
        ...(email.trim() ? { login_hint: email.trim() } : {}),
      },
    });
  };

  if (!open) return null;

  return <div className="modal-layer auth-gateway-layer" role="dialog" aria-modal="true" aria-label="Furrio member access">
    <form className="auth-gateway" onSubmit={submit}>
      <button className="icon-button auth-gateway__close" type="button" onClick={() => setOpen(false)} aria-label="Close sign in panel"><X size={20} /></button>
      <div className="auth-gateway__brand"><span><PawPrint size={22} /></span><div><strong>Furrio</strong><small>Community access</small></div></div>
      <div className="auth-gateway__copy"><span className="eyebrow">Find your way in</span><h2>{mode === "login" ? "Welcome back to the pack." : "Start your Furrio story."}</h2><p>{mode === "login" ? "Sign in to return to the creators, conversations, and collections you care about." : "Create your public identity, share your world, and find your people."}</p></div>
      <div className="auth-gateway__switch" role="tablist" aria-label="Member access choice"><button className={mode === "login" ? "auth-gateway__tab auth-gateway__tab--active" : "auth-gateway__tab"} type="button" onClick={() => setMode("login")}>Sign in</button><button className={mode === "signup" ? "auth-gateway__tab auth-gateway__tab--active" : "auth-gateway__tab"} type="button" onClick={() => setMode("signup")}>Join Furrio</button></div>
      <label className="auth-gateway__field"><span>Email address <em>optional</em></span><div><Mail size={17} /><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" /></div></label>
      <button className="auth-gateway__continue" type="submit">{mode === "login" ? "Continue to sign in" : "Create your account"}<ArrowUpRight size={18} /></button>
      <div className="auth-gateway__assurance"><ShieldCheck size={16} /><span><strong>Built for a safer community.</strong> {mode === "signup" ? "New email/password accounts verify their email once before participating." : "Your sign-in remains securely remembered on this device."}</span></div>
      <p className="auth-gateway__fineprint">Google and Apple options are available in the secure next step. Furrio never receives or stores your password.</p>
    </form>
  </div>;
}
