import { redirect } from "next/navigation";
import { getViewer } from "../../lib/auth";
import { AuthButton } from "../_components/auth-buttons";
import { Brand } from "../_components/brand";
import { FactPanel } from "./fact-panel";

function googlePhoto(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".googleusercontent.com") ? url.href : null;
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (!viewer.favoriteMovie) redirect("/onboarding");

  const name = viewer.name?.trim() || "Movie fan";
  const photo = googlePhoto(viewer.image);

  return (
    <>
      <header className="site-header"><Brand /><AuthButton action="sign-out" /></header>
      <main className="dashboard">
        <div className="profile">
          <div className="avatar" aria-hidden="true">
            {Array.from(name)[0].toUpperCase()}
            {photo && <img src={photo} alt="" width={56} height={56} referrerPolicy="no-referrer" />}
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Your screening room</p>
            <h1>{name}</h1>
            {viewer.email && <p className="muted break-all">{viewer.email}</p>}
          </div>
        </div>
        <div className="dashboard-grid">
          <section className="panel movie-panel" aria-labelledby="movie-title">
            <p className="eyebrow"><span className="accent-dot" /> Favorite movie</p>
            <h2 id="movie-title">{viewer.favoriteMovie}</h2>
            <div className="movie-decoration" aria-hidden="true">✦</div>
          </section>
          <FactPanel />
        </div>
      </main>
    </>
  );
}
