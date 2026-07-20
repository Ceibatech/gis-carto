import { NextResponse } from "next/server";

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

function configuredOrigins() {
  return (process.env.GEOARCHIVES_ALLOWED_ORIGINS ?? process.env.GEOARCHIVES_ALLOWED_ORIGIN ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

function allowedOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const normalizedRequestOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : "";
  const origins = configuredOrigins();

  if (!origins.length) {
    return requestOrigin ?? "*";
  }

  if (origins.includes("*")) {
    return "*";
  }

  if (normalizedRequestOrigin && origins.includes(normalizedRequestOrigin)) {
    return normalizedRequestOrigin;
  }

  return origins[0];
}

export function corsHeaders(request: Request) {
  return {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin(request),
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function corsJson<T>(request: Request, body: T, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsPreflight(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
