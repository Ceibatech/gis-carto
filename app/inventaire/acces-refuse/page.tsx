import Link from "next/link";

export default function AccessDeniedInventoryPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1>Acces refuse</h1>
        <p>Vous ne disposez pas des permissions necessaires pour cet espace.</p>
        <Link className="primary-button" href="/inventaire">Retour a l'inventaire</Link>
      </section>
    </main>
  );
}
