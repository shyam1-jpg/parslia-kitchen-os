/** Live weather via Open-Meteo (free, no API key). Used when chat asks about weather. */

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FETCH_MS = 8_000;

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function isWeatherQuery(message: string): boolean {
  return /\b(weather|temperature|forecast|humidity|rain|snow|windy|℃|°c|°f|degrees?\b.*(today|now|tonight|tomorrow)|(hot|cold|sunny|cloudy)\s+(today|outside|now))\b/i.test(
    message
  );
}

function extractLocation(message: string): string | null {
  const patterns = [
    /\b(?:weather|forecast|temperature|temps?)\s+(?:in|for|at|near)\s+([A-Za-z][A-Za-z\s,'-]{1,60})/i,
    /\b(?:in|for|near)\s+([A-Za-z][A-Za-z\s,'-]{1,60})\s+(?:weather|forecast|temperature)/i,
    /\b(?:what's|whats|how'?s)\s+(?:the\s+)?weather\s+(?:in|for|at)\s+([A-Za-z][A-Za-z\s,'-]{1,60})/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m?.[1]) {
      return m[1].replace(/[?.!,]+$/, "").trim();
    }
  }
  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function buildWeatherContext(message: string): Promise<{
  context: string | null;
  sources: { index: number; filename: string; excerpt: string; url: string }[];
}> {
  if (!isWeatherQuery(message)) return { context: null, sources: [] };

  const location = extractLocation(message) ?? "London";
  try {
    const geo = await fetchJson<{
      results?: Array<{ name: string; country?: string; latitude: number; longitude: number; timezone?: string }>;
    }>(`${GEOCODE_URL}?name=${encodeURIComponent(location)}&count=1&language=en`);

    const place = geo.results?.[0];
    if (!place) {
      return {
        context: `Live weather lookup: no location found for "${location}". Ask the user to clarify the city name.`,
        sources: [],
      };
    }

    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
      forecast_days: "3",
      timezone: place.timezone ?? "auto",
    });

    const forecast = await fetchJson<{
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        apparent_temperature?: number;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        weather_code?: number[];
      };
      current_units?: { temperature_2m?: string; wind_speed_10m?: string };
    }>(`${FORECAST_URL}?${params}`);

    const cur = forecast.current;
    if (!cur) return { context: null, sources: [] };

    const label = [place.name, place.country].filter(Boolean).join(", ");
    const condition = WEATHER_CODES[cur.weather_code ?? -1] ?? `Weather code ${cur.weather_code}`;
    const unit = forecast.current_units?.temperature_2m ?? "°C";
    const windUnit = forecast.current_units?.wind_speed_10m ?? "km/h";

    const dailyLines =
      forecast.daily?.time
        ?.slice(0, 3)
        .map((day, i) => {
          const max = forecast.daily?.temperature_2m_max?.[i];
          const min = forecast.daily?.temperature_2m_min?.[i];
          const precip = forecast.daily?.precipitation_sum?.[i];
          const code = forecast.daily?.weather_code?.[i];
          const cond = WEATHER_CODES[code ?? -1] ?? "";
          return `- ${day}: ${cond}; high ${max}${unit} / low ${min}${unit}; precip ${precip ?? 0} mm`;
        })
        .join("\n") ?? "";

    const context = [
      `Live weather data for ${label} (source: Open-Meteo). Use these numbers — do not say you lack real-time data.`,
      `Observed: ${cur.time}`,
      `Condition: ${condition}`,
      `Temperature: ${cur.temperature_2m}${unit} (feels like ${cur.apparent_temperature}${unit})`,
      `Humidity: ${cur.relative_humidity_2m}%`,
      `Wind: ${cur.wind_speed_10m} ${windUnit}`,
      dailyLines ? `Next days:\n${dailyLines}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      context,
      sources: [
        {
          index: 1,
          filename: `Weather · ${label}`,
          excerpt: `${condition}, ${cur.temperature_2m}${unit}`,
          url: `https://open-meteo.com/`,
        },
      ],
    };
  } catch (e) {
    console.warn("weather lookup failed:", e instanceof Error ? e.message : e);
    return { context: null, sources: [] };
  }
}
