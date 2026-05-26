"use client";

import { useState, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useSession, signIn } from "next-auth/react";
import { getClimateRiskForecast } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

import { PageHeader } from "@/components/page-header";
import { ClimateRiskMap, type MapLayerId } from "@/components/maps/ClimateRiskMap";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Lock,
  CloudSun,
  Droplets,
  TreePine,
  ShieldAlert,
} from "lucide-react";

const LAYERS: { id: MapLayerId; label: string }[] = [
  { id: "drought", label: "Drought" },
  { id: "rainfall", label: "Rainfall" },
  { id: "flood", label: "Flood Risk" },
  { id: "suitability", label: "Crop Suitability" },
];

type FormState = {
  message: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
  errors?: {
    region?: string[];
    days?: string[];
  };
};

const initialState: FormState = {
  message: null,
  data: null,
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? "Analyzing Climate Data..." : "Generate Map Analysis"}
    </Button>
  );
}

export default function ClimateMapPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [state, formAction] = useActionState(getClimateRiskForecast, initialState);
  const [layer, setLayer] = useState<MapLayerId>("drought");
  const [regionInput, setRegionInput] = useState("Punjab, India");
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: state.message,
      });
    }
  }, [state, toast]);

  if (sessionStatus === "loading") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access the Interactive Climate Risk Map.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AgroTrack uses real-time geocoded Open-Meteo forecasts coupled with Gemini AI reasoning to predict environmental risks. To secure usage, authentication is required.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => signIn()} className="w-full">
              Sign In to AgroTrack
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Determine center coordinates: use AI response coordinates if present, fallback to default coordinates.
  const latitude = state.data?.latitude ?? 20.5937;
  const longitude = state.data?.longitude ?? 78.9629;
  const displayedRegion = state.data ? regionInput : "India Center (Default)";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactive Climate Map"
        description="Geocode dynamic locations and visualize real-time drought, flood, and crop suitability risk layers powered by Gemini AI."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Control and Info Panel */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="shadow-sm border-muted/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Location Search</CardTitle>
              <CardDescription>
                Select a geographic region and time period.
              </CardDescription>
            </CardHeader>
            <form action={formAction}>
              <CardContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region / City</Label>
                  <Input
                    id="region"
                    name="region"
                    placeholder="e.g., Punjab, India"
                    value={regionInput}
                    onChange={(e) => setRegionInput(e.target.value)}
                    required
                  />
                  {state.errors?.region && (
                    <p className="text-xs font-medium text-destructive">
                      {state.errors.region[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="days">Forecast Duration</Label>
                  <Select name="days" defaultValue="30" required>
                    <SelectTrigger id="days">
                      <SelectValue placeholder="Select days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Next 7 Days</SelectItem>
                      <SelectItem value="30">Next 30 Days</SelectItem>
                      <SelectItem value="60">Next 60 Days</SelectItem>
                      <SelectItem value="90">Next 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  {state.errors?.days && (
                    <p className="text-xs font-medium text-destructive">
                      {state.errors.days[0]}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <SubmitButton />
              </CardFooter>
            </form>
          </Card>

          {/* AI Insights Card */}
          <Card className="shadow-sm border-muted/50">
            <CardHeader className="pb-3 border-b mb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {layer === "drought" && <Droplets className="h-5 w-5 text-amber-600" />}
                {layer === "rainfall" && <CloudSun className="h-5 w-5 text-blue-600" />}
                {layer === "flood" && <ShieldAlert className="h-5 w-5 text-purple-600" />}
                {layer === "suitability" && <TreePine className="h-5 w-5 text-green-600" />}
                <span className="capitalize">{layer} Layer Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state.data ? (
                <div className="space-y-4">
                  {layer === "drought" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded border border-amber-200/50">
                        <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Drought Stress Level:</span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          {state.data.droughtRiskLevel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {state.data.waterShortageRisk}
                      </p>
                    </div>
                  )}

                  {layer === "rainfall" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/20 p-2.5 rounded border border-blue-200/50">
                        <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Rainfall Outlook:</span>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                          {state.data.rainfallOutlookLevel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {state.data.extremeWeatherRisk}
                      </p>
                    </div>
                  )}

                  {layer === "flood" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-950/20 p-2.5 rounded border border-purple-200/50">
                        <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Flood Danger Level:</span>
                        <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                          {state.data.floodRiskLevel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {state.data.extremeWeatherRisk}
                      </p>
                      {state.data.weatherAlerts && state.data.weatherAlerts.length > 0 && (
                        <div className="mt-2 border-t pt-2 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            Active Weather Alerts
                          </span>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {state.data.weatherAlerts.map((alert: any, idx: number) => (
                            <div key={idx} className="text-xs bg-muted p-2 rounded">
                              <p className="font-semibold text-destructive">{alert.alertTitle}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {layer === "suitability" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/20 p-2.5 rounded border border-green-200/50">
                        <span className="text-xs font-medium text-green-800 dark:text-green-300">Crop Suitability Level:</span>
                        <span className="text-sm font-bold text-green-700 dark:text-green-400">
                          {state.data.cropSuitabilityLevel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {state.data.sustainabilityAnalysis}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">
                    Enter a region above and click <strong>Generate Map Analysis</strong> to see live AI summaries.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map Display Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-muted/40 p-2 rounded-lg border">
            <span className="text-xs font-medium text-muted-foreground px-2">Visual Layers:</span>
            <Tabs value={layer} onValueChange={(v) => setLayer(v as MapLayerId)} className="w-auto">
              <TabsList className="grid grid-cols-4 h-9 p-0.5 bg-background">
                {LAYERS.map((l) => (
                  <TabsTrigger
                    key={l.id}
                    value={l.id}
                    className="text-xs px-2.5 h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <Card className="p-3 shadow-md border-muted/70">
            <ClimateRiskMap
              region={displayedRegion}
              latitude={latitude}
              longitude={longitude}
              forecast={state.data}
              activeLayer={layer}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
