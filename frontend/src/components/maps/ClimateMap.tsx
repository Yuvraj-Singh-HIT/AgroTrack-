"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapDataResponse } from "@backend/services/map/mapTypes";
import type { ActiveLayerId } from "./RiskLegend";
import { RiskLegend } from "./RiskLegend";
import { MapMarkers } from "./MapMarkers";
import { WeatherOverlay } from "./WeatherOverlay";
import { CropZoneLayer } from "./CropZoneLayer";
import { HeatmapLayer } from "./HeatmapLayer";

// Dynamic imports for SSR-incompatible Leaflet components
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

/**
 * MapController re-centers the map when coordinates change.
 * Must be a child of MapContainer to access the map instance via useMap().
 */
const MapController = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useEffect: useEff } = require("react");
      return function Controller({
        center,
        zoom,
      }: {
        center: [number, number];
        zoom: number;
      }) {
        const map = mod.useMap();
        useEff(() => {
          map.flyTo(center, zoom, { duration: 1.5 });
        }, [center[0], center[1], zoom, map]);
        return null;
      };
    }),
  { ssr: false }
);

type MapTheme = "satellite" | "street" | "terrain" | "dark";

const TILE_URLS: Record<MapTheme, { url: string; attribution: string }> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
  },
};

interface Props {
  latitude: number;
  longitude: number;
  zoom?: number;
  data: MapDataResponse | null;
  activeLayer: ActiveLayerId;
  theme: MapTheme;
}

export function ClimateMap({
  latitude,
  longitude,
  zoom = 8,
  data,
  activeLayer,
  theme,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Initializing GIS engine…</span>
        </div>
      </div>
    );
  }

  const tile = TILE_URLS[theme];

  return (
    <div className="h-full w-full relative rounded-lg overflow-hidden">
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full z-0"
        zoomControl
      >
        <MapController center={[latitude, longitude]} zoom={zoom} />
        <TileLayer url={tile.url} attribution={tile.attribution} />

        {/* Heatmap overlay (rendered behind markers) */}
        {data && <HeatmapLayer data={data} activeLayer={activeLayer} />}

        {/* Weather concentric zones */}
        {data && <WeatherOverlay data={data} activeLayer={activeLayer} />}

        {/* Crop suitability boundary zones (only visible on cropZones layer) */}
        {data && activeLayer === "cropZones" && <CropZoneLayer data={data} />}

        {/* Monitoring station markers with popups */}
        {data && <MapMarkers data={data} activeLayer={activeLayer} />}
      </MapContainer>

      {/* Floating legend overlay */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none">
        <RiskLegend activeLayer={activeLayer} />
      </div>

      {/* Coordinates display chip */}
      <div className="absolute top-3 right-3 z-[1000] bg-background/80 backdrop-blur-md text-[10px] px-2.5 py-1 rounded-md border shadow-sm font-mono text-muted-foreground">
        {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
      </div>
    </div>
  );
}
