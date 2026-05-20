"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export type ExplainabilityData = {
  primarySource: string;
  modelName: string;
  confidenceBasis: string;
  evidence: string[];
  reasoning: string;
  fallbackUsed: boolean;
};

const SOURCE_LABELS: Record<string, string> = {
  local_cnn: "Local CNN",
  open_meteo: "Open-Meteo + AI",
  gemini: "Gemini AI",
  hybrid: "CNN + Gemini",
  rules: "Rule engine",
};

export function ExplainabilityPanel({ data }: { data: ExplainabilityData }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-5 w-5 text-primary" />
          Why this result?
          <Badge variant="outline" className="ml-auto">
            {SOURCE_LABELS[data.primarySource] ?? data.primarySource}
            {data.fallbackUsed ? " · fallback" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="font-medium">Model:</span> {data.modelName}
        </p>
        <p>
          <span className="font-medium">Confidence basis:</span> {data.confidenceBasis}
        </p>
        <div>
          <p className="font-medium mb-1">Evidence</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {data.evidence.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        <p className="text-muted-foreground">{data.reasoning}</p>
      </CardContent>
    </Card>
  );
}
