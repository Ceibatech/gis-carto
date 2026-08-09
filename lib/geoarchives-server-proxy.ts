import type { NextRequest } from "next/server";
import { isDatabaseConfigured } from "../db";
import { configuredGeoArchivesApiBaseUrl } from "./api-url";

// Relais serveur-a-serveur vers l'API GeoArchives distante (Render/Contabo)
// quand ce deploiement n'a pas d'acces direct a MySQL (front Vercel seul).
//
// Le navigateur ne parle jamais qu'a ce serveur, en meme origine: le cookie
// de session est donc pose et relu sur le domaine du front, jamais sur celui
// du backend. Sans ce relais, un fetch client direct vers le backend distant
// ne recevrait jamais le cookie (domaines differents), et l'API distante
// repondrait 401 alors que l'utilisateur vient de se connecter avec succes.
//
// La verification de session (HMAC) ne depend d'aucune donnee locale: tant
// que GEOARCHIVES_AUTH_SECRET est identique des deux cotes, le cote qui
// traite reellement la requete (ici, le backend distant) peut la valider
// lui-meme. Ce relais ne fait donc aucune verification: il se contente de
// transmettre cookies, methode et corps, puis de renvoyer la reponse telle
// quelle, Set-Cookie compris.
export async function proxyToRemoteApi(request: NextRequest, remotePath: string): Promise<Response | null> {
  if (isDatabaseConfigured()) return null;

  const baseUrl = configuredGeoArchivesApiBaseUrl();
  const requestUrl = new URL(request.url);
  if (requestUrl.host === new URL(baseUrl).host) return null;

  const method = request.method.toUpperCase();
  const payload = method === "GET" || method === "HEAD" ? undefined : await request.text();

  const response = await fetch(`${baseUrl}${remotePath}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": request.headers.get("content-type") ?? "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: payload,
    cache: "no-store",
  });

  const text = await response.text();
  const proxied = new Response(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    proxied.headers.set("set-cookie", setCookie);
  }

  return proxied;
}
