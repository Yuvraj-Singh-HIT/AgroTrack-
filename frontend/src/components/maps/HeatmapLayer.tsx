"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapDataResponse } from "@backend/services/map/mapTypes";
import type { ActiveLayerId } from "./RiskLegend";

const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);

interface Props {
  data: MapDataResponse;
  activeLayer: ActiveLayerId;
}

/**
 * Generates simulated heatmap "cells" around the queried location.
 * Uses large translucent Leaflet Circles to approximate a heatmap
 * without requiring a canvas-based heatmap library.
 * Each cell's color and opacity maps to the risk score for the active layer.
 */
export function HeatmapLayer({ data, activeLayer }: Props) {
  const cells = useMemo(() => {
    const score = getScoreForLayer(data, activeLayer);

    // Generate a grid of heatmap cells around the center point
    const GRID_SIZE = 4; // 4x4 = 16 cells
    const SPREAD_DEG = 0.3; // degrees of spread

    const result: Array<{
      key: string;
      lat: number;
      lng: number;
      radius: number; // meters
      color: string;
      opacity: number;
    }> = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // Each cell gets a slight random variation to create organic-looking patterns
        const variation = (Math.sin(row * 3.7 + col * 5.3) + 1) * 0.5; // deterministic 0-1
        const cellScore = Math.max(0, Math.min(100, score + (variation - 0.5) * 30));

        const latOffset = ((row - GRID_SIZE / 2 + 0.5) / GRID_SIZE) * SPREAD_DEG * 2;
        const lngOffset = ((col - GRID_SIZE / 2 + 0.5) / GRID_SIZE) * SPREAD_DEG * 2;

        result.push({
          key: `heat-${row}-${col}`,
          lat: data.latitude + latOffset,
          lng: data.longitude + lngOffset,
          radius: 12000 + variation * 6000, // 12-18km radius
          color: scoreToHeatColor(cellScore, activeLayer),
          opacity: 0.08 + variation * 0.12,
        });
      }
    }

    return result;
  }, [data, activeLayer]);

  return (
    <>
      {cells.map((cell) => (
        <Circle
          key={cell.key}
          center={[cell.lat, cell.lng]}
          radius={cell.radius}
          pathOptions={{
            color: "transparent",
            fillColor: cell.color,
            fillOpacity: cell.opacity,
            weight: 0,
          }}
        />
      ))}
    </>
  );
}

function getScoreForLayer(data: MapDataResponse, layer: ActiveLayerId): number {
  switch (layer) {
    case "rainfall": return data.risks.rainfallScore;
    case "drought": return data.risks.droughtRisk;
    case "flood": return data.risks.floodRisk;
    case "cropZones": return data.risks.cropSuitability;
    case "temperature":
      return Math.round(Math.max(0, Math.min(100, (data.weather.temperature / 50) * 100)));
    case "humidity": return Math.round(data.weather.humidity);
    default: return 50;
  }
}

/**
 * Maps a 0-100 score to a heat color.
 * For hazard layers: low=green, high=red.
 * For crop suitability: low=red, high=green (inverted).
 */
function scoreToHeatColor(score: number, layer: ActiveLayerId): string {
  const inverted = layer === "cropZones";
  const effective = inverted ? 100 - score : score;

  if (effective > 75) return "#dc2626";
  if (effective > 55) return "#ea580c";
  if (effective > 35) return "#eab308";
  if (effective > 15) return "#22c55e";
  return "#15803d";
}
