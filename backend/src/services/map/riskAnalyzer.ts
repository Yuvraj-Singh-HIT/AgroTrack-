import type { WeatherData, RiskScores } from "./mapTypes";

/**
 * Calculates flood risk percentage (0-100) based on rainfall, precipitation, and soil moisture.
 */
export function calculateFloodRisk(weather: WeatherData): number {
  let score = 0;

  // 1. Rainfall component (max 40 points)
  // 0 to 50mm map to 0 to 40 score
  score += Math.min(40, (weather.rainfall / 50) * 40);

  // 2. Precipitation component (max 30 points)
  // 0 to 75mm map to 0 to 30 score
  score += Math.min(30, (weather.precipitation / 75) * 30);

  // 3. Soil moisture saturation component (max 30 points)
  // Higher soil moisture means soil cannot absorb water, increasing flood risk
  // Open-Meteo soil moisture is in m³/m³ (typically 0.0 to 0.6)
  const saturation = weather.soilMoisture;
  if (saturation > 0.3) {
    score += Math.min(30, ((saturation - 0.3) / 0.3) * 30);
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculates drought risk percentage (0-100) based on temperature, soil moisture, and rainfall.
 */
export function calculateDroughtRisk(weather: WeatherData): number {
  let score = 0;

  // 1. Soil moisture deficit component (max 50 points)
  // Lower soil moisture increases drought stress
  const moisture = weather.soilMoisture;
  if (moisture < 0.3) {
    score += Math.min(50, ((0.3 - moisture) / 0.3) * 50);
  }

  // 2. Temperature component (max 35 points)
  // Temperatures above 30°C increase transpiration and drought risk
  if (weather.temperature > 30) {
    score += Math.min(35, ((weather.temperature - 30) / 15) * 35);
  }

  // 3. Rainfall deficit component (max 15 points)
  // Zero rainfall increases drought index
  if (weather.rainfall === 0) {
    score += 15;
  } else if (weather.rainfall < 5) {
    score += 8;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculates overall crop suitability percentage (0-100) based on temperature, soil moisture, and current risk levels.
 */
export function calculateCropSuitability(
  weather: WeatherData,
  floodRisk: number,
  droughtRisk: number
): number {
  let score = 100;

  // 1. Temperature suitability penalty
  // Ideal range: 20°C - 30°C
  const temp = weather.temperature;
  if (temp < 15) {
    score -= Math.min(30, ((15 - temp) / 15) * 30);
  } else if (temp > 32) {
    score -= Math.min(35, ((temp - 32) / 13) * 35);
  }

  // 2. Soil moisture suitability penalty
  // Ideal range: 0.20 to 0.40 m³/m³
  const moisture = weather.soilMoisture;
  if (moisture < 0.18) {
    score -= Math.min(25, ((0.18 - moisture) / 0.18) * 25);
  } else if (moisture > 0.42) {
    score -= Math.min(20, ((moisture - 0.42) / 0.18) * 20);
  }

  // 3. Environmental risk penalty
  // High drought risk or high flood risk makes crop cultivation difficult
  const highestRisk = Math.max(floodRisk, droughtRisk);
  if (highestRisk > 40) {
    score -= (highestRisk - 40) * 0.7; // subtract up to 42 points
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Computes all risk and suitability scores from weather metrics.
 */
export function analyzeRisks(weather: WeatherData): RiskScores {
  // Rainfall intensity is simply percentage of heavy rain (e.g. 50mm is 100%)
  const rainfallScore = Math.round(Math.max(0, Math.min(100, (weather.rainfall / 40) * 100)));
  const floodRisk = calculateFloodRisk(weather);
  const droughtRisk = calculateDroughtRisk(weather);
  const cropSuitability = calculateCropSuitability(weather, floodRisk, droughtRisk);

  return {
    rainfallScore,
    floodRisk,
    droughtRisk,
    cropSuitability,
  };
}
