import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Sprout,
  AlertTriangle,
} from "lucide-react";
import type { WeatherData, RiskScores, ClimateRecommendation } from "@backend/services/map/mapTypes";

interface Props {
  location: string;
  weather: WeatherData;
  risks: RiskScores;
  recommendation: ClimateRecommendation;
}

export function RiskPopup({ location, weather, risks, recommendation }: Props) {
  // Determine overall risk level
  const maxRisk = Math.max(risks.floodRisk, risks.droughtRisk);
  let riskBadgeColor = "bg-green-500 hover:bg-green-600 text-white";
  let riskLabel = "Low Risk";

  if (maxRisk > 75) {
    riskBadgeColor = "bg-red-700 hover:bg-red-800 text-white animate-pulse";
    riskLabel = "Critical Hazard";
  } else if (maxRisk > 50) {
    riskBadgeColor = "bg-red-500 hover:bg-red-600 text-white";
    riskLabel = "High Risk";
  } else if (maxRisk > 25) {
    riskBadgeColor = "bg-amber-500 hover:bg-amber-600 text-white";
    riskLabel = "Medium Risk";
  }

  return (
    <Card className="border-0 shadow-none p-0 max-w-[280px] w-full text-xs">
      <CardHeader className="p-3 pb-1 border-b">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-xs font-bold truncate max-w-[170px]">{location}</CardTitle>
            <CardDescription className="text-[10px]">Agro-Climate Assessment</CardDescription>
          </div>
          <Badge className={`text-[9px] px-1.5 py-0.5 whitespace-nowrap font-bold ${riskBadgeColor}`}>
            {riskLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-3">
        {/* Weather Metrics Grid */}
        <div className="grid grid-cols-2 gap-1.5 border-b pb-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Thermometer className="h-3 w-3 text-red-500" />
            <span>Temp: <strong className="text-foreground">{weather.temperature.toFixed(1)}°C</strong></span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Droplets className="h-3 w-3 text-blue-500" />
            <span>RH: <strong className="text-foreground">{weather.humidity}%</strong></span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CloudRain className="h-3 w-3 text-sky-500" />
            <span>Rain: <strong className="text-foreground">{weather.rainfall.toFixed(1)}mm</strong></span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Wind className="h-3 w-3 text-slate-500" />
            <span>Wind: <strong className="text-foreground">{weather.windSpeed.toFixed(0)}km/h</strong></span>
          </div>
        </div>

        {/* Risk Scores */}
        <div className="space-y-1.5 border-b pb-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted-foreground">Drought Index:</span>
            <span className={`font-semibold ${risks.droughtRisk > 50 ? "text-red-500" : risks.droughtRisk > 25 ? "text-amber-500" : "text-green-500"}`}>
              {risks.droughtRisk}%
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted-foreground">Flood Probability:</span>
            <span className={`font-semibold ${risks.floodRisk > 50 ? "text-red-500" : risks.floodRisk > 25 ? "text-amber-500" : "text-green-500"}`}>
              {risks.floodRisk}%
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted-foreground">Crop Suitability:</span>
            <span className={`font-semibold ${risks.cropSuitability > 70 ? "text-green-600" : risks.cropSuitability > 40 ? "text-amber-500" : "text-red-500"}`}>
              {risks.cropSuitability}%
            </span>
          </div>
        </div>

        {/* Recommended Crops */}
        {recommendation.cropRecommendations && recommendation.cropRecommendations.length > 0 && (
          <div className="space-y-1 border-b pb-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
              <Sprout className="h-3.5 w-3.5 text-green-600" />
              <span>Recommended Crops</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {recommendation.cropRecommendations.slice(0, 3).map((crop, idx) => (
                <Badge key={idx} variant="outline" className="text-[9px] bg-green-50/30 text-green-700 dark:text-green-400 border-green-200/50">
                  {crop}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Insight Snippet */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
            <AlertTriangle className="h-3 w-3 text-yellow-500 animate-bounce" />
            <span>AI Advice Snapshot</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-normal italic line-clamp-3">
            {recommendation.farmingAdvice}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
