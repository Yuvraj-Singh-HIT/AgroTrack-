import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  Navigation,
  RefreshCw,
  Sparkles,
  CloudRain,
  ShieldAlert,
  Droplets,
  TreePine,
  Thermometer,
  Flame,
} from "lucide-react";
import type { ActiveLayerId } from "./RiskLegend";

type MapTheme = "satellite" | "street" | "terrain" | "dark";

interface Props {
  activeLayer: ActiveLayerId;
  onLayerChange: (layer: ActiveLayerId) => void;
  days: string;
  onDaysChange: (days: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onCurrentLocation: () => void;
  onRefresh: () => void;
  onAiSummary: () => void;
  activeTheme: MapTheme;
  onThemeChange: (theme: MapTheme) => void;
  isLoading: boolean;
  hasData: boolean;
}

export function MapControls({
  activeLayer,
  onLayerChange,
  days,
  onDaysChange,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onCurrentLocation,
  onRefresh,
  onAiSummary,
  activeTheme,
  onThemeChange,
  isLoading,
  hasData,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersList: { id: ActiveLayerId; label: string; icon: any; color: string }[] = [
    { id: "rainfall", label: "Rainfall", icon: CloudRain, color: "text-blue-500" },
    { id: "drought", label: "Drought", icon: Droplets, color: "text-amber-600" },
    { id: "flood", label: "Flood Risk", icon: ShieldAlert, color: "text-red-500" },
    { id: "cropZones", label: "Crop Zones", icon: TreePine, color: "text-green-600" },
    { id: "temperature", label: "Temperature", icon: Thermometer, color: "text-rose-500" },
    { id: "humidity", label: "Humidity", icon: Flame, color: "text-sky-500" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Search Panel */}
      <Card className="shadow-sm border-muted/50">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Location Search</CardTitle>
          <CardDescription className="text-[11px]">
            Center map on specific agricultural zones.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <form onSubmit={onSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={isLoading} className="h-9 px-3">
              Search
            </Button>
          </form>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCurrentLocation}
              disabled={isLoading}
              className="flex-1 text-xs gap-1.5 h-9"
              title="Use your device GPS location"
            >
              <Navigation className="h-3.5 w-3.5" />
              GPS Coordinates
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9 w-9"
              title="Refresh current mapping data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Visual Layer Selector */}
      <Card className="shadow-sm border-muted/50">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Climate Analytics Layers</CardTitle>
          <CardDescription className="text-[11px]">
            Toggle active telemetry indicators on map.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-2">
            {layersList.map((l) => {
              const IconComp = l.icon;
              const isActive = activeLayer === l.id;
              return (
                <Button
                  key={l.id}
                  variant={isActive ? "secondary" : "outline"}
                  onClick={() => onLayerChange(l.id)}
                  className={`justify-start text-[11px] h-9 px-2 gap-2 border border-muted/40 font-medium ${
                    isActive ? "bg-accent/65 font-bold shadow-sm ring-1 ring-primary/10" : ""
                  }`}
                >
                  <IconComp className={`h-4 w-4 ${l.color}`} />
                  <span className="truncate">{l.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Parameter settings */}
      <Card className="shadow-sm border-muted/50">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Telemetry Controls</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="days-select" className="text-[11px] font-medium text-muted-foreground">
              Temporal Depth (Days)
            </Label>
            <Select value={days} onValueChange={onDaysChange}>
              <SelectTrigger id="days-select" className="h-8 text-xs">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7-Day Forecast</SelectItem>
                <SelectItem value="30">30-Day Outlook</SelectItem>
                <SelectItem value="60">60-Day Outlook</SelectItem>
                <SelectItem value="90">90-Day Outlook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme-select" className="text-[11px] font-medium text-muted-foreground">
              Map Style Base Theme
            </Label>
            <Select value={activeTheme} onValueChange={(v) => onThemeChange(v as MapTheme)}>
              <SelectTrigger id="theme-select" className="h-8 text-xs">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="street">Street Map (Standard)</SelectItem>
                <SelectItem value="satellite">Satellite View (Agri-Imaging)</SelectItem>
                <SelectItem value="terrain">Topography / Terrain</SelectItem>
                <SelectItem value="dark">High-Contrast Dark Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 4. AI Generator Trigger */}
      <Button
        onClick={onAiSummary}
        disabled={isLoading || !hasData}
        className="w-full gap-2 py-5 shadow bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold transition-all duration-300"
      >
        <Sparkles className="h-4 w-4 animate-pulse" />
        Compile AI Crop Recommendations
      </Button>
    </div>
  );
}
