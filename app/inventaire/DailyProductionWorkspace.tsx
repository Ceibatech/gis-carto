"use client";

import { useState } from "react";
import type { InventoryActor } from "../../lib/inventory-rbac";
import { UserSidebar } from "../components/inventory-workspace-ui";

const today = new Date().toISOString().slice(0, 10);

export default function DailyProductionWorkspace({ actor }: { actor: InventoryActor }) {
  const [form, setForm] = useState({ productionDate: today, cartonsCount: 0, dossiersCount: 0, damagedCartonsCount: 0, damagedDossiersCount: 0, difficulties: "" });
  const [message, setMessage] = useState<string | null>(null);
  const update = (key: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  async function submit() {
    setMessage(null);
    const response = await fetch("/api/inventaire-ceiba/remontee", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setMessage(response.ok ? "Remontee journaliere enregistree." : "Impossible d'enregistrer la remontee.");
  }
  return <div className="inventory-layout"><UserSidebar activeKey="daily" items={[{ key: "new", label: "Nouvelle fiche", href: "/inventaire" }, { key: "daily", label: "Remontee journaliere", href: "/inventaire/remontee" }, { key: "records", label: "Mes fiches", href: "/inventaire/registre" }, { key: "overview", label: "Vue d'ensemble", href: "/inventaire?tab=overview" }]} />
    <main className="inventory-main"><header className="inventory-header-card"><div><p className="panel-label">CG1020</p><h1>Remontee des donnees journalieres</h1></div><div className="session-chip compact"><span>Operateur</span><strong>{actor.name}</strong></div></header>
      <section className="ceiba-panel inventory-entry-workspace"><div className="inventory-form-section"><p className="inventory-section-kicker">Fiche individuelle</p><h3>Production du jour</h3><div className="inventory-form-grid">
        <label><span>Date</span><input type="date" value={form.productionDate} onChange={(event) => update("productionDate", event.target.value)} /></label>
        <label><span>Nbre de cartons</span><input type="number" min="0" value={form.cartonsCount} onChange={(event) => update("cartonsCount", Number(event.target.value))} /></label>
        <label><span>Nbre de dossiers</span><input type="number" min="0" value={form.dossiersCount} onChange={(event) => update("dossiersCount", Number(event.target.value))} /></label>
        <label><span>Nbre de cartons degrades</span><input type="number" min="0" value={form.damagedCartonsCount} onChange={(event) => update("damagedCartonsCount", Number(event.target.value))} /></label>
        <label><span>Nbre de dossiers degrades</span><input type="number" min="0" value={form.damagedDossiersCount} onChange={(event) => update("damagedDossiersCount", Number(event.target.value))} /></label>
        <label className="wide"><span>Difficultes majeures rencontrees</span><textarea rows={4} value={form.difficulties} onChange={(event) => update("difficulties", event.target.value)} /></label>
      </div></div><div className="inventory-sticky-actions"><span>{message}</span><button className="primary-button" type="button" onClick={() => void submit()}>Enregistrer la remontee</button></div></section>
    </main></div>;
}