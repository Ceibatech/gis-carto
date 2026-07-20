"use client";

import type { GeoJsonObject } from "geojson";
import { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { DashboardSite } from "../lib/geoarchives-types";

const ivoryCoastCenter: [number, number] = [7.54, -5.55];

type SiteOperationsMapProps = {
  sites: DashboardSite[];
  selectedCode: string;
  onSelectSite: (code: string) => void;
};

export default function SiteOperationsMap({ onSelectSite, selectedCode, sites }: SiteOperationsMapProps) {
  const geolocatedSites = sites.filter((site) => site.latitude !== null && site.longitude !== null);
  const center = geolocatedSites.length
    ? averageCenter(geolocatedSites)
    : ivoryCoastCenter;
  const [countryLayer, setCountryLayer] = useState<GeoJsonObject | null>(null);
  const [regionsLayer, setRegionsLayer] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLayers() {
      const [countryResponse, regionsResponse] = await Promise.all([
        fetch("/maps/civ-adm0.geojson"),
        fetch("/maps/civ-adm1.geojson"),
      ]);

      if (!countryResponse.ok || !regionsResponse.ok || cancelled) {
        return;
      }

      const [countryJson, regionsJson] = await Promise.all([
        countryResponse.json() as Promise<GeoJsonObject>,
        regionsResponse.json() as Promise<GeoJsonObject>,
      ]);

      if (!cancelled) {
        setCountryLayer(countryJson);
        setRegionsLayer(regionsJson);
      }
    }

    loadLayers().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="leaflet-map-shell">
      <MapContainer center={center} className="leaflet-map" scrollWheelZoom zoom={6.6}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {countryLayer ? <GeoJSON data={countryLayer} pathOptions={{ color: "#0a4f3e", fillColor: "#b7d6c6", fillOpacity: 0.1, weight: 2.2 }} /> : null}
        {regionsLayer ? <GeoJSON data={regionsLayer} pathOptions={{ color: "#5d897b", fillOpacity: 0, weight: 1.2, dashArray: "4 4" }} /> : null}
        <MapViewport selectedCode={selectedCode} sites={geolocatedSites} />
        {geolocatedSites.map((site) => (
          <CircleMarker
            center={[site.latitude ?? 0, site.longitude ?? 0]}
            eventHandlers={{ click: () => onSelectSite(site.code) }}
            key={site.code}
            pathOptions={{
              color: site.code === selectedCode ? "#ffffff" : markerStroke(site.risk),
              fillColor: markerFill(site.risk),
              fillOpacity: 0.9,
              weight: site.code === selectedCode ? 3 : 2,
            }}
            radius={site.code === selectedCode ? 13 : markerRadius(site.risk)}
          >
            <Popup>
              <div className="map-popup">
                <strong>{site.name}</strong>
                <span>{site.region} / {site.city}</span>
                <span>Priorite {site.priority}/100</span>
                <span>Risque {site.risk}/100</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

function MapViewport({ selectedCode, sites }: { selectedCode: string; sites: DashboardSite[] }) {
  const map = useMap();

  useEffect(() => {
    if (!sites.length) {
      map.setView(ivoryCoastCenter, 6.6);
      return;
    }

    const selectedSite = sites.find((site) => site.code === selectedCode);
    if (selectedSite?.latitude !== null && selectedSite?.longitude !== null) {
      map.flyTo([selectedSite.latitude, selectedSite.longitude], 8.5, { duration: 0.8 });
      return;
    }

    const bounds = sites.map((site) => [site.latitude ?? 0, site.longitude ?? 0] as [number, number]);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 7.6 });
  }, [map, selectedCode, sites]);

  return null;
}

function averageCenter(sites: DashboardSite[]): [number, number] {
  const latitude = sites.reduce((sum, site) => sum + (site.latitude ?? 0), 0) / sites.length;
  const longitude = sites.reduce((sum, site) => sum + (site.longitude ?? 0), 0) / sites.length;
  return [latitude, longitude];
}

function markerFill(risk: number) {
  if (risk >= 80) return "#c74232";
  if (risk >= 60) return "#c88c1f";
  if (risk >= 40) return "#265fc7";
  return "#0f7d5c";
}

function markerStroke(risk: number) {
  if (risk >= 80) return "#8f2218";
  if (risk >= 60) return "#8a5a0e";
  if (risk >= 40) return "#194eae";
  return "#0a4f3e";
}

function markerRadius(risk: number) {
  if (risk >= 80) return 12;
  if (risk >= 60) return 11;
  if (risk >= 40) return 10;
  return 9;
}