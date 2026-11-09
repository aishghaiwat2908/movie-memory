import { redirect } from "next/navigation";
import { getViewer } from "../lib/auth";
import { AuthButton } from "./_components/auth-buttons";
import { Brand } from "./_components/brand";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  if (viewer) redirect(viewer.favoriteMovie ? "/dashboard" : "/onboarding");

  return (
    <>
      <header className="site-header"><Brand /></header>
      <main className="landing">
        <section className="hero">
          <p className="eyebrow"><span className="accent-dot" /> For the love of film</p>
          <h1>Some films <em>stay with us.</em></h1>
          <p className="hero-description">
            Save the movie you keep coming back to. Then discover a little of what happened behind the camera.
          </p>
          <AuthButton action="sign-in" />
          {params.error && <p className="error-note mt-4" role="alert">Google sign-in didn’t go through. Try again.</p>}
        </section>
        <div className="poster" aria-hidden="true">
          <div className="poster-meta"><span>THE SCREENING ROOM</span><span>01 / 01</span></div>
          <div className="reel-scene">
            <div className="orbit orbit-wide" />
            <div className="orbit orbit-narrow" />
            <div className="reel">
              <span /><span /><span /><span /><span />
              <div className="reel-hub" />
            </div>
          </div>
          <div className="poster-meta poster-bottom"><span>YOUR FAVORITE FILM</span><span>✦</span></div>
        </div>
      </main>
      <footer className="site-footer">A personal screening room, always open.</footer>
    </>
  );
}
