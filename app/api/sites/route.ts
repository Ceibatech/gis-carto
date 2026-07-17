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
    ["code", input.code],
    ["name", input.name],
    ["organization", input.organization],
    ["region", input.region],
    ["district", input.district],
    ["department", input.department],
    ["city", input.city],
    ["lead", input.lead],
  ];

  for (const [label, value] of required) {
    if (!String(value ?? "").trim()) {
      throw new Error(`Champ requis manquant: ${label}`);
    }
  }

  for (const [label, value] of [
    ["meters", input.meters],
    ["boxes", input.boxes],
    ["pages", input.pages],
    ["risk", input.risk],
    ["priority", input.priority],
    ["progress", input.progress],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Valeur invalide: ${label}`);
    }
  }
}
