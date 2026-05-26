"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapDataResponse } from "@backend/services/map/mapTypes";
import type { ActiveLayerId } from "./RiskLegend";

const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);

interface Props {
  data: MapDataResponse;
  activeLayer: ActiveLayerId;
}

/**
 * Renders translucent circle regions around the center point
 * to simulate weather overlay zones (e.g. rain cells, humidity pockets).
 */
export function WeatherOverlay({ data, activeLayer }: Props) {
  const zones = useMemo(() => {
    const base = data;
    // Generate 3 concentric zones with decreasing intensity
    return [
      { radiusScale: 0.08, opacity: 0.15 },
      { radiusScale: 0.14, opacity: 0.10 },
      { radiusScale: 0.22, opacity: 0.06 },
    ].map((z, i) => ({
      key: `weather-zone-${i}`,
      lat: base.latitude + (Math.random() - 0.5) * 0.02,
      lng: base.longitude + (Math.random() - 0.5) * 0.02,
      radius: 20 + i * 8,
      opacity: z.opacity,
      color: getLayerColor(activeLayer),
    }));
  }, [data.latitude, data.longitude, activeLayer]);

  return (
    <>
      {zones.map((z) => (
        <CircleMarker
          key={z.key}
          center={[z.lat, z.lng]}
          radius={z.radius}
          pathOptions={{
            color: z.color,
            fillColor: z.color,
            fillOpacity: z.opacity,
            weight: 1,
            opacity: 0.3,
          }}
        />
      ))}
    </>
  );
}

function getLayerColor(layer: ActiveLayerId): string {
  switch (layer) {
    case "rainfall": return "#3b82f6";
    case "drought": return "#ea580c";
    case "flood": return "#7c3aed";
    case "cropZones": return "#16a34a";
    case "temperature": return "#dc2626";
    case "humidity": return "#0ea5e9";
    default: return "#6b7280";
  }
}
