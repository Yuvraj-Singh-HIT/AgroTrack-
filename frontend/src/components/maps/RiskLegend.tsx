import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ActiveLayerId =
  | "rainfall"
  | "drought"
  | "flood"
  | "cropZones"
  | "temperature"
  | "humidity";

interface Props {
  activeLayer: ActiveLayerId;
}

interface LegendConfig {
  title: string;
  gradient: string;
  labels: { min: string; mid?: string; max: string };
  description: string;
}

const LEGEND_CONFIGS: Record<ActiveLayerId, LegendConfig> = {
  rainfall: {
    title: "Rainfall Intensity",
    gradient: "from-blue-200 to-blue-900",
    labels: { min: "Light (0mm)", mid: "Moderate", max: "Torrential (50mm+)" },
    description: "Daily rainfall accumulation",
  },
  drought: {
    title: "Drought Risk Index",
    gradient: "from-blue-500 via-orange-400 to-red-600",
    labels: { min: "Hydrated", mid: "Moderate Stress", max: "Extreme Drought" },
    description: "Evaporative demand & soil dryness",
  },
  flood: {
    title: "Flood Risk Index",
    gradient: "from-green-500 via-yellow-400 to-red-600",
    labels: { min: "Low Risk", mid: "Caution", max: "Severe Inundation" },
    description: "Saturated soils & runoff potential",
  },
  cropZones: {
    title: "Crop Suitability Zone",
    gradient: "from-red-600 via-yellow-400 to-green-600",
    labels: { min: "Unsuitable", mid: "Marginal", max: "Highly Suitable" },
    description: "Agro-climatic growth conditions",
  },
  temperature: {
    title: "Temperature Distribution",
    gradient: "from-blue-500 via-yellow-400 to-red-600",
    labels: { min: "Cool (<15°C)", mid: "Mild", max: "Extreme Heat (>35°C)" },
    description: "Ambient air temperature",
  },
  humidity: {
    title: "Relative Humidity",
    gradient: "from-amber-600 via-sky-300 to-blue-800",
    labels: { min: "Dry (<30%)", mid: "Moderate", max: "Saturated (>90%)" },
    description: "Atmospheric water vapour ratio",
  },
};

export function RiskLegend({ activeLayer }: Props) {
  const config = LEGEND_CONFIGS[activeLayer];

  return (
    <Card className="bg-background/90 backdrop-blur-md border shadow-lg w-56 text-xs transition-all duration-300 pointer-events-auto">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs font-bold leading-none">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        <div className={`h-3.5 w-full rounded bg-gradient-to-r ${config.gradient} border border-muted/50`} />
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>{config.labels.min}</span>
          {config.labels.mid && <span>{config.labels.mid}</span>}
          <span>{config.labels.max}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-normal italic border-t pt-1.5 mt-1">
          {config.description}
        </p>
      </CardContent>
    </Card>
  );
}
