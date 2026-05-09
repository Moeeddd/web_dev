import { logger } from '../config/logger';

interface WeatherResponse {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  weatherCode: number;
}

interface WeatherData extends WeatherResponse {
  severity: 'calm' | 'moderate' | 'rough' | 'severe' | 'extreme';
  description: string;
}

const weatherCodeDescriptions: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function getWeatherSeverity(windSpeed: number, waveHeight: number, weatherCode: number): WeatherData['severity'] {
  if (windSpeed > 60 || waveHeight > 6 || weatherCode >= 95) return 'extreme';
  if (windSpeed > 40 || waveHeight > 4 || weatherCode >= 80) return 'severe';
  if (windSpeed > 25 || waveHeight > 2.5 || weatherCode >= 61) return 'rough';
  if (windSpeed > 15 || waveHeight > 1.5 || weatherCode >= 45) return 'moderate';
  return 'calm';
}

export async function fetchWeatherForPosition(lat: number, lng: number): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data: any = await response.json();
    const current = data.current;

    const windSpeed = current.wind_speed_10m || 0;
    // Estimate wave height from wind speed (simplified Beaufort scale approximation)
    const waveHeight = Math.min(windSpeed / 10, 8);
    const weatherCode = current.weather_code || 0;

    const severity = getWeatherSeverity(windSpeed, waveHeight, weatherCode);

    return {
      temperature: current.temperature_2m || 25,
      windSpeed,
      windDirection: current.wind_direction_10m || 0,
      waveHeight: Math.round(waveHeight * 10) / 10,
      weatherCode,
      severity,
      description: weatherCodeDescriptions[weatherCode] || 'Unknown',
    };
  } catch (error) {
    logger.warn('Weather API fetch failed, using defaults', { lat, lng, error });
    return {
      temperature: 28,
      windSpeed: 12,
      windDirection: 180,
      waveHeight: 0.8,
      weatherCode: 1,
      severity: 'calm',
      description: 'Mainly clear (fallback)',
    };
  }
}

/** Fetch weather for multiple positions (batched) */
export async function fetchWeatherBatch(
  positions: { lat: number; lng: number; shipId: string }[]
): Promise<Map<string, WeatherData>> {
  const results = new Map<string, WeatherData>();

  // Open-Meteo allows batch requests, but we'll throttle to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize);
    const promises = batch.map(async (pos) => {
      const weather = await fetchWeatherForPosition(pos.lat, pos.lng);
      results.set(pos.shipId, weather);
    });
    await Promise.all(promises);

    // Small delay between batches
    if (i + batchSize < positions.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
