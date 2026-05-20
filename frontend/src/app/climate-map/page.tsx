"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ClimateRiskMap, type MapLayerId } from "@/components/maps/ClimateRiskMap";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LAYERS: { id: MapLayerId; label: string }[] = [
  { id: "drought", label: "Drought" },
  { id: "rainfall", label: "Rainfall" },
  { id: "flood", label: "Flood risk" },
  { id: "suitability", label: "Crop suitability" },
];

export default function ClimateMapPage() {
  const [region, setRegion] = useState("Punjab, India");
  const [layer, setLayer] = useState<MapLayerId>("drought");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Climate risk map"
        description="Interactive pilot map with drought, rainfall, flood, and suitability layers."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Layer</Label>
          <Tabs value={layer} onValueChange={(v) => setLayer(v as MapLayerId)}>
            <TabsList className="flex flex-wrap h-auto">
              {LAYERS.map((l) => (
                <TabsTrigger key={l.id} value={l.id}>
                  {l.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <ClimateRiskMap region={region} activeLayer={layer} />
    </div>
  );
}
