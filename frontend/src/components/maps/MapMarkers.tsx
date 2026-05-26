"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapDataResponse } from "@backend/services/map/mapTypes";
import type { ActiveLayerId } from "./RiskLegend";

const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

interface Props {
  data: MapDataResponse;
  activeLayer: ActiveLayerId;
}

/**
 * Simulated nearby monitoring station offsets relative to the queried center.
 * Each station has a directional label and a small risk modifier to create
 * spatial variation in the visualization.
 */
const STATION_OFFSETS = [
  { name: "NW Agro-Station", latOff: 0.18, lngOff: -0.14, riskMod: -5 },
  { name: "NE Agro-Station", latOff: 0.15, lngOff: 0.16, riskMod: 3 },
  { name: "SE Agro-Station", latOff: -0.13, lngOff: 0.18, riskMod: 8 },
  { name: "SW Agro-Station", latOff: -0.16, lngOff: -0.12, riskMod: -3 },
  { name: "Central-S Station", latOff: -0.22, lngOff: 0.02, riskMod: 5 },
];

/** Maps a risk score (0-100) to a color depending on layer semantics. */
function scoreToColor(score: number, layer: ActiveLayerId): string {
  // For crop suitability, high = green; for hazards, high = red
  const inverted = layer === "cropZones";
  const effective = inverted ? 100 - score : score;

  if (effective > 65) return "#dc2626"; // red
  if (effective > 40) return "#ea580c"; // orange
  if (effective > 20) return "#ca8a04"; // yellow
  return "#16a34a"; // green
}

/** Picks the relevant numeric score from risk data for a given layer. */
function layerScore(data: MapDataResponse, layer: ActiveLayerId): number {
  switch (layer) {
    case "rainfall":
      return data.risks.rainfallScore;
    case "drought":
      return data.risks.droughtRisk;
    case "flood":
      return data.risks.floodRisk;
    case "cropZones":
      return data.risks.cropSuitability;
    case "temperature":
      // Normalize temperature 0-50°C → 0-100
      return Math.round(Math.max(0, Math.min(100, (data.weather.temperature / 50) * 100)));
    case "humidity":
      return Math.round(data.weather.humidity);
    default:
      return 50;
  }
}

export function MapMarkers({ data, activeLayer }: Props) {
  const centerScore = layerScore(data, activeLayer);
  const centerColor = scoreToColor(centerScore, activeLayer);

  const stations = useMemo(
    () =>
      STATION_OFFSETS.map((s) => {
        const adjusted = Math.max(0, Math.min(100, centerScore + s.riskMod));
        return {
          name: `${data.location} (${s.name})`,
          lat: data.latitude + s.latOff,
          lng: data.longitude + s.lngOff,
          score: adjusted,
          color: scoreToColor(adjusted, activeLayer),
        };
      }),
    [data, activeLayer, centerScore]
  );

  return (
    <>
      {/* Primary center marker */}
      <CircleMarker
        center={[data.latitude, data.longitude]}
        radius={14}
        pathOptions={{
          color: centerColor,
          fillColor: centerColor,
          fillOpacity: 0.55,
          weight: 3,
        }}
      >
        <Popup maxWidth={300} minWidth={260}>
          <div className="max-w-[280px] space-y-2 text-xs p-1">
            <p className="font-bold text-sm border-b pb-1">{data.location}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Temperature:</span>
              <span className="font-semibold">{data.weather.temperature.toFixed(1)}°C</span>
              <span className="text-muted-foreground">Humidity:</span>
              <span className="font-semibold">{data.weather.humidity}%</span>
              <span className="text-muted-foreground">Rainfall:</span>
              <span className="font-semibold">{data.weather.rainfall.toFixed(1)} mm</span>
              <span className="text-muted-foreground">Wind:</span>
              <span className="font-semibold">{data.weather.windSpeed.toFixed(0)} km/h</span>
            </div>
            <div className="border-t pt-1 grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Flood Risk:</span>
              <span className="font-semibold">{data.risks.floodRisk}%</span>
              <span className="text-muted-foreground">Drought Risk:</span>
              <span className="font-semibold">{data.risks.droughtRisk}%</span>
              <span className="text-muted-foreground">Crop Suitability:</span>
              <span className="font-semibold">{data.risks.cropSuitability}%</span>
            </div>
            {data.recommendation.cropRecommendations.length > 0 && (
              <div className="border-t pt-1">
                <p className="text-muted-foreground font-medium mb-0.5">Recommended Crops:</p>
                <p className="font-semibold">{data.recommendation.cropRecommendations.join(", ")}</p>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground italic border-t pt-1 leading-relaxed">
              {data.recommendation.farmingAdvice}
            </p>
          </div>
        </Popup>
      </CircleMarker>

      {/* Simulated surrounding monitoring stations */}
      {stations.map((s, idx) => (
        <CircleMarker
          key={idx}
          center={[s.lat, s.lng]}
          radius={8}
          pathOptions={{
            color: s.color,
            fillColor: s.color,
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Popup>
            <div className="max-w-[200px] text-xs space-y-1 p-1">
              <p className="font-semibold text-xs border-b pb-0.5">{s.name}</p>
              <p className="capitalize text-muted-foreground">
                Layer: <strong className="text-foreground">{activeLayer}</strong>
              </p>
              <p className="text-muted-foreground">
                Score: <strong style={{ color: s.color }}>{s.score}</strong>/100
              </p>
              <p className="text-[9px] text-muted-foreground italic mt-1">
                Localized telemetry node tracking microclimate fluctuations.
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
