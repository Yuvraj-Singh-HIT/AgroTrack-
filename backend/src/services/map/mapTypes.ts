export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  precipitation: number;
  soilMoisture: number;
}

export interface RiskScores {
  rainfallScore: number;
  floodRisk: number;
  droughtRisk: number;
  cropSuitability: number;
}

export interface ClimateRecommendation {
  cropRecommendations: string[];
  farmingAdvice: string;
  irrigationAdvice: string;
  riskMitigation: string[];
  fertilizerSuggestions: string[];
  expectedYieldInsights: string;
}

export interface RiskReport {
  id?: string;
  userId: string;
  location: string;
  latitude: number;
  longitude: number;
  rainfall: number;
  temperature: number;
  floodRisk: number;
  droughtRisk: number;
  cropSuitability: number;
  recommendation: string; // Serialized ClimateRecommendation or summary
  timestamp: Date;
}

export interface MapDataResponse {
  location: string;
  latitude: number;
  longitude: number;
  weather: WeatherData;
  risks: RiskScores;
  recommendation: ClimateRecommendation;
}
