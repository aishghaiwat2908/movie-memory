import { redirect } from "next/navigation";
import { getViewer } from "../../lib/auth";
import { AuthButton } from "../_components/auth-buttons";
import { Brand } from "../_components/brand";
import { MovieForm } from "./movie-form";

export default async function Onboarding() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.favoriteMovie) redirect("/dashboard");

  return (
    <>
      <header className="site-header"><Brand /><AuthButton action="sign-out" /></header>
      <main className="onboarding">
        <section className="panel">
          <p className="eyebrow"><span className="accent-dot" /> First screening</p>
          <h1>What’s your favorite movie?</h1>
          <p className="muted mt-3">Pick the film you’d happily watch one more time.</p>
          <MovieForm />
        </section>
      </main>
    </>
  );
}
