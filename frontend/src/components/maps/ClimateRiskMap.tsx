"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ClimateRiskForecastOutput } from "@/ai/flows/climate-risk-forecast";
import { cn } from "@/lib/utils";

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

const MapController = dynamic(
  () =>
    import("react-leaflet").then((m) => {
      return function Controller({ center, zoom }: { center: [number, number]; zoom: number }) {
        const map = m.useMap();
        useEffect(() => {
          map.setView(center, zoom);
        }, [center, zoom, map]);
        return null;
      };
    }),
  { ssr: false }
);

type Props = {
  region: string;
  latitude?: number;
  longitude?: number;
  forecast?: ClimateRiskForecastOutput | null;
  activeLayer: MapLayerId;
};



function getRiskColor(level: string | undefined, layer: MapLayerId) {
  if (!level) {
    switch (layer) {
      case "drought": return "#b45309";
      case "rainfall": return "#2563eb";
      case "flood": return "#7c3aed";
      case "suitability": return "#15803d";
    }
  }

  const lvl = level.toLowerCase();
  
  if (layer === "rainfall") {
    if (lvl.includes("below")) return "#ea580c"; // Dry / drought
    if (lvl.includes("above")) return "#1d4ed8"; // Heavy rain
    return "#3b82f6"; // Normal
  }

  if (layer === "suitability") {
    if (lvl.includes("high")) return "#16a34a"; // Green
    if (lvl.includes("medium")) return "#ca8a04"; // Yellow
    return "#dc2626"; // Red
  }

  if (lvl.includes("high")) return "#dc2626";
  if (lvl.includes("medium")) return "#ea580c";
  return "#16a34a";
}

function shiftRiskLevel(level: string | undefined, shift: number): string {
  if (!level) return "Low";
  const levels = ["Low", "Medium", "High"];
  let idx = levels.indexOf(level);
  if (idx === -1) idx = 1;
  const newIdx = Math.max(0, Math.min(2, idx + shift));
  return levels[newIdx];
}

function shiftRainfallLevel(level: string | undefined, shift: number): string {
  if (!level) return "Normal";
  const levels = ["Below Normal", "Normal", "Above Normal"];
  let idx = levels.indexOf(level);
  if (idx === -1) idx = 1;
  const newIdx = Math.max(0, Math.min(2, idx + shift));
  return levels[newIdx];
}

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

  const centerLevel = useMemo(() => {
    if (!forecast) return undefined;
    switch (activeLayer) {
      case "drought": return forecast.droughtRiskLevel;
      case "rainfall": return forecast.rainfallOutlookLevel;
      case "flood": return forecast.floodRiskLevel;
      case "suitability": return forecast.cropSuitabilityLevel;
    }
  }, [forecast, activeLayer]);

  const activeColor = useMemo(() => {
    return getRiskColor(centerLevel, activeLayer);
  }, [centerLevel, activeLayer]);



  const subPoints = useMemo(() => {
    if (!latitude || !longitude) return [];
    return [
      { name: "North Station", latOff: 0.12, lngOff: 0.08, riskMod: -1 },
      { name: "East Station", latOff: -0.05, lngOff: 0.15, riskMod: 0 },
      { name: "South Station", latOff: -0.15, lngOff: -0.07, riskMod: 1 },
      { name: "West Station", latOff: 0.08, lngOff: -0.12, riskMod: 0 },
    ].map((o) => ({
      name: `${region} (${o.name})`,
      lat: latitude + o.latOff,
      lng: longitude + o.lngOff,
      riskMod: o.riskMod,
    }));
  }, [latitude, longitude, region]);

  if (!ready) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }



  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full animate-pulse"
            style={{ backgroundColor: activeColor }}
          />
          <span className="font-medium capitalize">{activeLayer} Analysis</span>
          <span className="text-muted-foreground">— {region}</span>
        </div>
        {centerLevel && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded font-semibold">
            Status: {centerLevel}
          </span>
        )}
      </div>
      <div className="h-[420px] overflow-hidden rounded-lg border shadow-sm relative">
        <MapContainer
          center={[latitude, longitude]}
          zoom={8}
          scrollWheelZoom
          className="h-full w-full z-0"
        >
          <MapController center={[latitude, longitude]} zoom={8} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker
            center={[latitude, longitude]}
            radius={14}
            pathOptions={{ color: activeColor, fillColor: activeColor, fillOpacity: 0.5 }}
          >
            <Popup>
              <div className="max-w-xs space-y-2 text-sm">
                <p className="font-semibold text-sm border-b pb-1 mb-1">{region} (Center)</p>
                {forecast ? (
                  <div className="space-y-1">
                    <p className="flex justify-between gap-4 text-xs">
                      <span className="text-muted-foreground font-medium">Drought Risk:</span>
                      <span className={cn("font-semibold", 
                        forecast.droughtRiskLevel === "High" ? "text-red-600" :
                        forecast.droughtRiskLevel === "Medium" ? "text-orange-500" : "text-green-600"
                      )}>{forecast.droughtRiskLevel}</span>
                    </p>
                    <p className="flex justify-between gap-4 text-xs">
                      <span className="text-muted-foreground font-medium">Rainfall Outlook:</span>
                      <span className="font-semibold text-blue-600">{forecast.rainfallOutlookLevel}</span>
                    </p>
                    <p className="flex justify-between gap-4 text-xs">
                      <span className="text-muted-foreground font-medium">Flood Risk:</span>
                      <span className={cn("font-semibold",
                        forecast.floodRiskLevel === "High" ? "text-red-600" :
                        forecast.floodRiskLevel === "Medium" ? "text-orange-500" : "text-green-600"
                      )}>{forecast.floodRiskLevel}</span>
                    </p>
                    <p className="flex justify-between gap-4 text-xs">
                      <span className="text-muted-foreground font-medium">Crop Suitability:</span>
                      <span className={cn("font-semibold",
                        forecast.cropSuitabilityLevel === "High" ? "text-green-600" :
                        forecast.cropSuitabilityLevel === "Medium" ? "text-yellow-600" : "text-red-600"
                      )}>{forecast.cropSuitabilityLevel}</span>
                    </p>
                    <div className="mt-2 border-t pt-1 text-[10px] text-muted-foreground leading-relaxed max-h-20 overflow-y-auto">
                      {forecast.sustainabilityAnalysis}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Run a forecast to see AI details.</p>
                )}
              </div>
            </Popup>
          </CircleMarker>

          {subPoints.map((p, idx) => {
            const level = activeLayer === "rainfall" 
              ? shiftRainfallLevel(forecast?.rainfallOutlookLevel, p.riskMod)
              : shiftRiskLevel(
                  activeLayer === "drought" ? forecast?.droughtRiskLevel :
                  activeLayer === "flood" ? forecast?.floodRiskLevel :
                  forecast?.cropSuitabilityLevel,
                  p.riskMod
                );
            const color = getRiskColor(level, activeLayer);

            return (
              <CircleMarker
                key={idx}
                center={[p.lat, p.lng]}
                radius={8}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.35 }}
              >
                <Popup>
                  <div className="max-w-xs space-y-1 text-xs">
                    <p className="font-semibold border-b pb-0.5 mb-1">{p.name}</p>
                    <p className="flex justify-between gap-4">
                      <span className="text-muted-foreground font-medium">Layer:</span>
                      <span className="capitalize">{activeLayer}</span>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span className="text-muted-foreground font-medium">Local Level:</span>
                      <span className="font-semibold" style={{ color }}>{level}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Localized telemetry node tracking microclimate fluctuations.
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <p className="text-[11px] text-muted-foreground italic">
        Radius illustrates relative spatial area. Active observations are simulated for regional pilot mapping using Open-Meteo geocoding.
      </p>
    </div>
  );
}
