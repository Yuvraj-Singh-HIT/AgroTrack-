"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSession, signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchClimateRiskMapDataAction,
  fetchClimateRiskMapDataByCoordsAction,
} from "@backend/lib/actions/mapActions";
import type { MapDataResponse } from "@backend/services/map/mapTypes";
import type { ActiveLayerId } from "@/components/maps/RiskLegend";
import { MapControls } from "@/components/maps/MapControls";
import { LoadingMapSkeleton } from "@/components/maps/LoadingMapSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Lock,
  Loader2,
  CloudSun,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";

// Dynamic import of the map to avoid SSR issues with Leaflet
const ClimateMap = dynamic(
  () => import("@/components/maps/ClimateMap").then((m) => m.ClimateMap),
  { ssr: false, loading: () => <LoadingMapSkeleton /> }
);

type MapTheme = "satellite" | "street" | "terrain" | "dark";

export default function ClimateRiskMapPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();

  // Map state
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Control state
  const [searchQuery, setSearchQuery] = useState("Punjab, India");
  const [activeLayer, setActiveLayer] = useState<ActiveLayerId>("rainfall");
  const [days, setDays] = useState("30");
  const [mapTheme, setMapTheme] = useState<MapTheme>("street");
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Map center (defaults to India)
  const [latitude, setLatitude] = useState(20.5937);
  const [longitude, setLongitude] = useState(78.9629);

  // Debounced search handler
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchClimateRiskMapDataAction(searchQuery.trim());
        if (!result.success || !result.data) {
          setError(result.message ?? "Failed to fetch climate data.");
          toast({
            variant: "destructive",
            title: "Search Failed",
            description: result.message ?? "Unknown error",
          });
        } else {
          setMapData(result.data);
          setLatitude(result.data.latitude);
          setLongitude(result.data.longitude);
          toast({
            title: "Location Analyzed",
            description: `Climate intelligence loaded for ${result.data.location}`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(msg);
        toast({ variant: "destructive", title: "Error", description: msg });
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, isLoading, toast]
  );

  // Current location handler using browser Geolocation API
  const handleCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation Unavailable", description: "Your browser does not support geolocation." });
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const result = await fetchClimateRiskMapDataByCoordsAction(lat, lng);
          if (!result.success || !result.data) {
            setError(result.message ?? "Failed to fetch data for your location.");
            toast({ variant: "destructive", title: "Error", description: result.message ?? "Unknown error" });
          } else {
            setMapData(result.data);
            setLatitude(result.data.latitude);
            setLongitude(result.data.longitude);
            toast({ title: "Location Detected", description: `Climate data loaded for your GPS coordinates.` });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Location fetch failed.";
          setError(msg);
          toast({ variant: "destructive", title: "Error", description: msg });
        } finally {
          setIsLoading(false);
        }
      },
      (geoErr) => {
        setIsLoading(false);
        const msg =
          geoErr.code === 1
            ? "Location permission denied. Please allow location access."
            : "Could not determine your location.";
        setError(msg);
        toast({ variant: "destructive", title: "Location Error", description: msg });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [toast]);

  // Refresh handler — re-fetches data for the current search query
  const handleRefresh = useCallback(() => {
    if (searchQuery.trim()) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent);
    }
  }, [searchQuery, handleSearch]);

  // AI Summary panel toggle
  const handleAiSummary = useCallback(() => {
    setShowAiPanel((prev) => !prev);
  }, []);

  // Session loading state
  if (sessionStatus === "loading") {
    return <LoadingMapSkeleton />;
  }

  // Unauthenticated state
  if (!session) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-3">
              <Lock className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              Sign in to access the Climate Risk Intelligence Map.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AgroTrack uses real-time Open-Meteo weather data combined with Gemini AI to generate
              actionable agricultural climate intelligence. Authentication is required for secure usage.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => signIn()}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              Sign In to AgroTrack
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-130px)] flex flex-col">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/10">
            <CloudSun className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-headline">Climate Risk Intelligence</h1>
            <p className="text-xs text-muted-foreground">AI-powered agricultural risk monitoring</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analyzing climate telemetry…
          </div>
        )}
      </motion.div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-2.5 rounded-lg flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr] flex-1 overflow-hidden">
        {/* Left Panel — Controls */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="overflow-y-auto pr-1 hidden lg:block"
        >
          <MapControls
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            days={days}
            onDaysChange={setDays}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={handleSearch}
            onCurrentLocation={handleCurrentLocation}
            onRefresh={handleRefresh}
            onAiSummary={handleAiSummary}
            activeTheme={mapTheme}
            onThemeChange={setMapTheme}
            isLoading={isLoading}
            hasData={!!mapData}
          />
        </motion.div>

        {/* Mobile Controls Collapsed */}
        <div className="lg:hidden space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-9 px-3 text-sm border rounded-md bg-background"
            />
            <Button type="submit" size="sm" disabled={isLoading} className="h-9">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </form>
        </div>

        {/* Right Panel — Map */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-lg border border-muted/70 shadow-md overflow-hidden relative min-h-[400px]"
        >
          <ClimateMap
            latitude={latitude}
            longitude={longitude}
            data={mapData}
            activeLayer={activeLayer}
            theme={mapTheme}
          />
        </motion.div>
      </div>

      {/* AI Recommendations Slide-Up Panel */}
      <AnimatePresence>
        {showAiPanel && mapData && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <Card className="max-w-4xl mx-auto shadow-2xl border-emerald-200/30 bg-background/95 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
                    <div>
                      <CardTitle className="text-base">Gemini AI Crop Intelligence — {mapData.location}</CardTitle>
                      <CardDescription className="text-[11px]">
                        Powered by Open-Meteo weather data and Gemini 2.5 Flash
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAiPanel(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 max-h-[50vh] overflow-y-auto">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Farming Advice */}
                  <div className="space-y-1.5 bg-emerald-50/30 dark:bg-emerald-950/10 p-3 rounded-lg border border-emerald-200/30">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">🌾 Farming Advice</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{mapData.recommendation.farmingAdvice}</p>
                  </div>

                  {/* Irrigation Advice */}
                  <div className="space-y-1.5 bg-blue-50/30 dark:bg-blue-950/10 p-3 rounded-lg border border-blue-200/30">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">💧 Irrigation Advice</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{mapData.recommendation.irrigationAdvice}</p>
                  </div>

                  {/* Yield Insights */}
                  <div className="space-y-1.5 bg-amber-50/30 dark:bg-amber-950/10 p-3 rounded-lg border border-amber-200/30">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">📈 Expected Yield</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{mapData.recommendation.expectedYieldInsights}</p>
                  </div>

                  {/* Recommended Crops */}
                  <div className="space-y-1.5 bg-green-50/30 dark:bg-green-950/10 p-3 rounded-lg border border-green-200/30">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400">🌱 Recommended Crops</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {mapData.recommendation.cropRecommendations.map((crop, i) => (
                        <li key={i}>{crop}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Risk Mitigation Steps */}
                {mapData.recommendation.riskMitigation.length > 0 && (
                  <div className="space-y-1.5 bg-red-50/30 dark:bg-red-950/10 p-3 rounded-lg border border-red-200/30">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400">🛡️ Risk Mitigation</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {mapData.recommendation.riskMitigation.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fertilizer Suggestions */}
                {mapData.recommendation.fertilizerSuggestions.length > 0 && (
                  <div className="space-y-1.5 bg-purple-50/30 dark:bg-purple-950/10 p-3 rounded-lg border border-purple-200/30">
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400">🧪 Fertilizer Suggestions</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {mapData.recommendation.fertilizerSuggestions.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
