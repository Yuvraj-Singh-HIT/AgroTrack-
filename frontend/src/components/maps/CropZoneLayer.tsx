"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapDataResponse } from "@backend/services/map/mapTypes";

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
}

/**
 * Simulates crop suitability boundary zones using large translucent circles.
 * Each zone represents a different agro-climatic micro-region.
 * Color is based on the suitability score:
 *   Green = highly suitable, Yellow = marginal, Red = unsuitable.
 */
export function CropZoneLayer({ data }: Props) {
  const suitability = data.risks.cropSuitability;

  const zones = useMemo(() => {
    // Create multiple crop zone polygons (approximated with circles)


    return [
      { name: "Primary Arable Zone", latOff: 0, lngOff: 0, r: 28, scoreMod: 0 },
      { name: "Northern Irrigated Belt", latOff: 0.25, lngOff: -0.1, r: 18, scoreMod: -8 },
      { name: "Eastern Rain-Fed Zone", latOff: -0.05, lngOff: 0.28, r: 16, scoreMod: 5 },
      { name: "Southern Dryland Pocket", latOff: -0.28, lngOff: -0.08, r: 14, scoreMod: -15 },
    ].map((z) => {
      const adjusted = Math.max(0, Math.min(100, suitability + z.scoreMod));
      const color =
        adjusted > 70 ? "#16a34a" : adjusted > 40 ? "#ca8a04" : "#dc2626";
      return {
        ...z,
        lat: data.latitude + z.latOff,
        lng: data.longitude + z.lngOff,
        color,
        score: adjusted,
      };
    });
  }, [data.latitude, data.longitude, suitability]);

  return (
    <>
      {zones.map((z, i) => (
        <CircleMarker
          key={`crop-zone-${i}`}
          center={[z.lat, z.lng]}
          radius={z.r}
          pathOptions={{
            color: z.color,
            fillColor: z.color,
            fillOpacity: 0.12,
            weight: 2,
            dashArray: "6 4",
          }}
        >
          <Popup>
            <div className="text-xs space-y-1 p-1 max-w-[180px]">
              <p className="font-semibold border-b pb-0.5">{z.name}</p>
              <p className="text-muted-foreground">
                Suitability: <strong style={{ color: z.color }}>{z.score}%</strong>
              </p>
              <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                Agro-climatic micro-zone classification for cropping guidance.
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
