"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="onboarding">
      <section className="panel">
        <p className="eyebrow">Movie Memory</p>
        <h1>We couldn’t load this page.</h1>
        <button type="button" className="button button-primary mt-6" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
