"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ClimateRiskForecastOutput } from "@/ai/flows/climate-risk-forecast";

export type MapLayerId = "drought" | "rainfall" | "flood" | "suitability";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), {
  ssr: false,
});
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

type Props = {
  region: string;
  latitude?: number;
  longitude?: number;
  forecast?: ClimateRiskForecastOutput | null;
  activeLayer: MapLayerId;
};

const LAYER_LEGEND: Record<MapLayerId, { label: string; color: string }> = {
  drought: { label: "Drought stress", color: "#b45309" },
  rainfall: { label: "Rainfall outlook", color: "#2563eb" },
  flood: { label: "Flood / heavy rain", color: "#7c3aed" },
  suitability: { label: "Crop suitability", color: "#15803d" },
};

/** Interactive Leaflet map with layer legend and forecast popup. */
export function ClimateRiskMap({
  region,
  latitude = 20.5937,
  longitude = 78.9629,
  forecast,
  activeLayer,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const radius = useMemo(() => {
    switch (activeLayer) {
      case "drought":
        return 18000;
      case "flood":
        return 22000;
      case "rainfall":
        return 16000;
      default:
        return 14000;
    }
  }, [activeLayer]);

  if (!ready) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  const legend = LAYER_LEGEND[activeLayer];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: legend.color }}
        />
        <span className="font-medium">{legend.label}</span>
        <span className="text-muted-foreground">— {region}</span>
      </div>
      <div className="h-[420px] overflow-hidden rounded-lg border">
        <MapContainer
          center={[latitude, longitude]}
          zoom={6}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker
            center={[latitude, longitude]}
            radius={12}
            pathOptions={{ color: legend.color, fillColor: legend.color, fillOpacity: 0.45 }}
          >
            <Popup>
              <div className="max-w-xs space-y-1 text-sm">
                <p className="font-semibold">{region}</p>
                {forecast ? (
                  <>
                    <p>Water: {forecast.waterShortageRisk}</p>
                    <p>Weather: {forecast.extremeWeatherRisk}</p>
                    <p className="text-xs text-muted-foreground">
                      {forecast.sustainabilityAnalysis.slice(0, 160)}…
                    </p>
                  </>
                ) : (
                  <p>Run a forecast to see AI details here.</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
          <CircleMarker
            center={[latitude + 0.4, longitude + 0.3]}
            radius={8}
            pathOptions={{ color: legend.color, fillOpacity: 0.2 }}
          />
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Radius ~{(radius / 1000).toFixed(0)} km illustrates relative {legend.label.toLowerCase()}{" "}
        for pilot visualization (not official government hazard zones).
      </p>
    </div>
  );
}
