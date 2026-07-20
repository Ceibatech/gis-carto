import { NextResponse } from "next/server";
import type { CaptureSiteInput } from "../../../lib/geoarchives-types";
import { createCapturedSite, getGeoArchivesDashboard } from "../../../db/geoarchives";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CaptureSiteInput;
    validateSiteInput(input);
    await createCapturedSite(input);
    const dashboard = await getGeoArchivesDashboard();
    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer la fiche";
    return NextResponse.json({ message }, { status: 400 });
  }
}

function validateSiteInput(input: CaptureSiteInput) {
  const required = [
    ["Code site", input.code],
    ["Nom du site", input.name],
    ["Organisation", input.organization],
    ["Région", input.region],
    ["District", input.district],
    ["Département", input.department],
    ["Ville", input.city],
    ["Point focal", input.lead],
    ["Fonction du répondant", input.respondentRole],
  ];

  for (const [label, value] of required) {
    if (!String(value ?? "").trim()) {
      throw new Error(`Merci de renseigner: ${label}`);
    }
  }

  for (const [label, value] of [
    ["Mètres linéaires", input.meters],
    ["Boîtes", input.boxes],
    ["Pages", input.pages],
    ["Risque", input.risk],
    ["Priorité", input.priority],
    ["Avancement", input.progress],
    ["Temps d'accès", input.travelTimeMinutes],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Valeur invalide pour: ${label}`);
    }
  }

  if (!input.roadCondition.trim()) {
    throw new Error("Merci de renseigner: État de la route");
  }

  if (!input.networkQuality.trim()) {
    throw new Error("Merci de renseigner: Qualité réseau");
  }
}
