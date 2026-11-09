"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

export function AuthButton({ action }: { action: "sign-in" | "sign-out" }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const signingIn = action === "sign-in";

  async function submit() {
    setPending(true);
    setFailed(false);
    try {
      if (signingIn) await signIn("google", { callbackUrl: "/" });
      else await signOut({ callbackUrl: "/" });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" className={signingIn ? "button button-google" : "button button-quiet"} onClick={submit} disabled={pending}>
        {signingIn && (
          <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.77 7.18l7.73 6C44.4 38.04 46.98 31.9 46.98 24.55z"/>
            <path fill="#FBBC05" d="M10.54 28.59a14.45 14.45 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.93 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        )}
        {signingIn ? (pending ? "Connecting…" : "Sign in with Google") : (pending ? "Signing out…" : "Sign out")}
      </button>
      {failed && <p className="error-note mt-3" role="alert">Something went wrong. Try again.</p>}
    </div>
  );
}
