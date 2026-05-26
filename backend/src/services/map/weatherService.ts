import type { WeatherData } from "./mapTypes";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const DEFAULT_TIMEOUT = 10000; // 10 seconds

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const weatherCache = new Map<string, CacheEntry>();

/**
 * Fetches real weather data from Open-Meteo for a given latitude and longitude.
 * Includes a 30-minute cache, timeout, and custom retry logic with backoff.
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,precipitation,soil_moisture_0_to_7cm`;

  const rawData = await fetchWithRetryAndTimeout(url);
  const current = rawData?.current;

  if (!current) {
    throw new Error("Invalid response structure from Open-Meteo weather service.");
  }

  const data: WeatherData = {
    temperature: typeof current.temperature_2m === "number" ? current.temperature_2m : 25,
    humidity: typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : 60,
    rainfall: typeof current.rain === "number" ? current.rain : 0,
    windSpeed: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : 10,
    precipitation: typeof current.precipitation === "number" ? current.precipitation : 0,
    soilMoisture: typeof current.soil_moisture_0_to_7cm === "number" ? current.soil_moisture_0_to_7cm : 0.25,
  };

  weatherCache.set(cacheKey, { data, timestamp: now });
  return data;
}

async function fetchWithRetryAndTimeout(
  url: string,
  retries = 3,
  backoffMs = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(id);
      console.warn(`[WeatherService] Attempt ${attempt} failed for URL: ${url}. Error: ${error}`);

      if (attempt === retries) {
        throw error;
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
    }
  }
}
