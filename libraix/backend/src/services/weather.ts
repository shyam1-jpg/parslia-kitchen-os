/** Live weather via Open-Meteo — rich forecast payload for ChatGPT-style briefs + UI cards. */

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FETCH_MS = 10_000;

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
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export type WeatherIcon = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface WeatherHour {
  time: string;
  hourLabel: string;
  temp: number;
  precipProb: number;
  weatherCode: number;
  condition: string;
  icon: WeatherIcon;
  wind: number;
}

export interface WeatherDay {
  date: string;
  weekday: string;
  high: number;
  low: number;
  precipSum: number;
  precipProbMax: number;
  weatherCode: number;
  condition: string;
  icon: WeatherIcon;
  uvMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  windMax: number | null;
}

export interface WeatherCardData {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  observedAt: string;
  units: { temp: string; wind: string; precip: string };
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    wind: number;
    windGust: number | null;
    weatherCode: number;
    condition: string;
    icon: WeatherIcon;
    pressure: number | null;
    cloudCover: number | null;
    visibilityKm: number | null;
    uvIndex: number | null;
  };
  sun: { sunrise: string | null; sunset: string | null };
  hourly: WeatherHour[];
  daily: WeatherDay[];
  tips: string[];
}

export function isWeatherQuery(message: string): boolean {
  return /\b(weather|temperature|forecast|humidity|rain|snow|windy|uv\b|sunrise|sunset|℃|°c|°f|degrees?\b.*(today|now|tonight|tomorrow)|(hot|cold|sunny|cloudy)\s+(today|outside|now))\b/i.test(
    message
  );
}

function cleanLocation(raw: string): string {
  return raw
    .replace(/[?.!,]+$/g, "")
    .replace(/\b(today|tonight|tomorrow|now|currently|please|right now|this week|hourly)\b.*$/i, "")
    .trim();
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
      const loc = cleanLocation(m[1]);
      if (loc.length >= 2) return loc;
    }
  }
  return null;
}

function iconForCode(code: number): WeatherIcon {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

function conditionFor(code: number): string {
  return WEATHER_CODES[code] ?? `Weather code ${code}`;
}

function formatHour(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: true,
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

function formatWeekday(date: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

function formatClock(iso: string | null | undefined, timezone: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
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

function buildTips(card: WeatherCardData): string[] {
  const tips: string[] = [];
  const c = card.current;
  if (c.temp <= 5) tips.push("Dress warmly — cold conditions; layer up.");
  else if (c.temp >= 28) tips.push("Stay hydrated and seek shade in the heat.");
  else if (c.temp >= 18 && c.temp <= 24 && (c.icon === "clear" || c.icon === "partly"))
    tips.push("Pleasant outdoor weather — a light jacket or short sleeves.");
  if (c.humidity >= 80) tips.push("High humidity — it may feel stickier than the temperature suggests.");
  if ((c.uvIndex ?? 0) >= 6) tips.push(`UV index ${c.uvIndex} — sunscreen recommended.`);
  if (card.hourly.some((h) => h.precipProb >= 50)) tips.push("Rain is likely later — bring an umbrella.");
  if ((c.windGust ?? c.wind) >= 40) tips.push("Gusty winds — secure outdoor items.");
  if (c.icon === "storm") tips.push("Thunderstorms possible — avoid exposed open areas.");
  if (!tips.length) tips.push("No severe conditions flagged — a normal day outdoors.");
  return tips.slice(0, 4);
}

function buildNarrativeContext(card: WeatherCardData): string {
  const hourlyMd = card.hourly
    .map(
      (h) =>
        `| ${h.hourLabel} | ${h.temp}${card.units.temp} | ${h.condition} | ${h.precipProb}% | ${h.wind} ${card.units.wind} |`
    )
    .join("\n");

  const dailyMd = card.daily
    .map(
      (d) =>
        `| ${d.weekday} | ${d.condition} | ${d.high}/${d.low}${card.units.temp} | rain ${d.precipProbMax}% (${d.precipSum} ${card.units.precip}) | UV ${d.uvMax ?? "—"} | ↑ ${d.sunrise ?? "—"} ↓ ${d.sunset ?? "—"} |`
    )
    .join("\n");

  return [
    `You have LIVE detailed weather for ${card.location} (Open-Meteo). A visual weather card is already shown to the user — do NOT say you lack real-time data.`,
    `Write a ChatGPT-style weather brief:`,
    `1. Short headline + feeling description.`,
    `2. Current snapshot (temp, feels like, humidity, wind, pressure/UV if present).`,
    `3. Next 12 hours story (when it warms/cools, rain windows).`,
    `4. 7-day outlook in a markdown table.`,
    `5. Practical tips (clothing, umbrella, UV).`,
    `Use markdown headings, bullet lists, and tables. Keep it vivid but factual using ONLY this data.`,
    ``,
    `### Current`,
    `- Observed: ${card.observedAt} (${card.timezone})`,
    `- ${card.current.condition}; ${card.current.temp}${card.units.temp} (feels ${card.current.feelsLike}${card.units.temp})`,
    `- Humidity ${card.current.humidity}% · Wind ${card.current.wind} ${card.units.wind}${card.current.windGust != null ? ` (gusts ${card.current.windGust})` : ""}`,
    `- Pressure ${card.current.pressure ?? "—"} hPa · Cloud ${card.current.cloudCover ?? "—"}% · Visibility ${card.current.visibilityKm ?? "—"} km · UV ${card.current.uvIndex ?? "—"}`,
    `- Sunrise ${card.sun.sunrise ?? "—"} · Sunset ${card.sun.sunset ?? "—"}`,
    ``,
    `### Hourly (next ~24h)`,
    `| Hour | Temp | Sky | Rain % | Wind |`,
    `|---|---|---|---|---|`,
    hourlyMd,
    ``,
    `### Daily`,
    `| Day | Sky | High/Low | Precip | UV | Sun |`,
    `|---|---|---|---|---|---|`,
    dailyMd,
    ``,
    `### Tips seed`,
    ...card.tips.map((t) => `- ${t}`),
  ].join("\n");
}

export async function buildWeatherContext(message: string): Promise<{
  context: string | null;
  sources: { index: number; filename: string; excerpt: string; url: string }[];
  weatherCard: WeatherCardData | null;
}> {
  if (!isWeatherQuery(message)) return { context: null, sources: [], weatherCard: null };

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
        weatherCard: null,
      };
    }

    const timezone = place.timezone ?? "auto";
    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "wind_speed_10m",
        "wind_gusts_10m",
        "surface_pressure",
        "cloud_cover",
        "visibility",
        "uv_index",
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation_probability",
        "weather_code",
        "wind_speed_10m",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "uv_index_max",
        "sunrise",
        "sunset",
        "wind_speed_10m_max",
      ].join(","),
      forecast_days: "7",
      forecast_hours: "24",
      timezone,
    });

    const forecast = await fetchJson<{
      timezone?: string;
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        wind_gusts_10m?: number;
        apparent_temperature?: number;
        surface_pressure?: number;
        cloud_cover?: number;
        visibility?: number;
        uv_index?: number;
      };
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        precipitation_probability?: number[];
        weather_code?: number[];
        wind_speed_10m?: number[];
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        precipitation_probability_max?: number[];
        weather_code?: number[];
        uv_index_max?: number[];
        sunrise?: string[];
        sunset?: string[];
        wind_speed_10m_max?: number[];
      };
      current_units?: { temperature_2m?: string; wind_speed_10m?: string; precipitation_sum?: string };
    }>(`${FORECAST_URL}?${params}`);

    const cur = forecast.current;
    if (!cur || cur.temperature_2m == null) return { context: null, sources: [], weatherCard: null };

    const tz = forecast.timezone ?? timezone;
    const label = [place.name, place.country].filter(Boolean).join(", ");
    const code = cur.weather_code ?? 0;
    const unit = forecast.current_units?.temperature_2m ?? "°C";
    const windUnit = forecast.current_units?.wind_speed_10m ?? "km/h";

    const now = cur.time ? new Date(cur.time).getTime() : Date.now();
    const hourly: WeatherHour[] = [];
    const times = forecast.hourly?.time ?? [];
    for (let i = 0; i < times.length && hourly.length < 24; i++) {
      const t = new Date(times[i]).getTime();
      if (t < now - 30 * 60 * 1000) continue;
      const wcode = forecast.hourly?.weather_code?.[i] ?? 0;
      hourly.push({
        time: times[i],
        hourLabel: formatHour(times[i], tz),
        temp: Math.round((forecast.hourly?.temperature_2m?.[i] ?? 0) * 10) / 10,
        precipProb: Math.round(forecast.hourly?.precipitation_probability?.[i] ?? 0),
        weatherCode: wcode,
        condition: conditionFor(wcode),
        icon: iconForCode(wcode),
        wind: Math.round((forecast.hourly?.wind_speed_10m?.[i] ?? 0) * 10) / 10,
      });
    }

    const daily: WeatherDay[] = (forecast.daily?.time ?? []).slice(0, 7).map((date, i) => {
      const wcode = forecast.daily?.weather_code?.[i] ?? 0;
      return {
        date,
        weekday: formatWeekday(date, tz),
        high: Math.round((forecast.daily?.temperature_2m_max?.[i] ?? 0) * 10) / 10,
        low: Math.round((forecast.daily?.temperature_2m_min?.[i] ?? 0) * 10) / 10,
        precipSum: Math.round((forecast.daily?.precipitation_sum?.[i] ?? 0) * 10) / 10,
        precipProbMax: Math.round(forecast.daily?.precipitation_probability_max?.[i] ?? 0),
        weatherCode: wcode,
        condition: conditionFor(wcode),
        icon: iconForCode(wcode),
        uvMax: forecast.daily?.uv_index_max?.[i] ?? null,
        sunrise: formatClock(forecast.daily?.sunrise?.[i], tz),
        sunset: formatClock(forecast.daily?.sunset?.[i], tz),
        windMax: forecast.daily?.wind_speed_10m_max?.[i] ?? null,
      };
    });

    const card: WeatherCardData = {
      location: label,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: tz,
      observedAt: cur.time ?? new Date().toISOString(),
      units: { temp: unit, wind: windUnit, precip: "mm" },
      current: {
        temp: Math.round(cur.temperature_2m * 10) / 10,
        feelsLike: Math.round((cur.apparent_temperature ?? cur.temperature_2m) * 10) / 10,
        humidity: Math.round(cur.relative_humidity_2m ?? 0),
        wind: Math.round((cur.wind_speed_10m ?? 0) * 10) / 10,
        windGust: cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m * 10) / 10 : null,
        weatherCode: code,
        condition: conditionFor(code),
        icon: iconForCode(code),
        pressure: cur.surface_pressure != null ? Math.round(cur.surface_pressure) : null,
        cloudCover: cur.cloud_cover != null ? Math.round(cur.cloud_cover) : null,
        visibilityKm: cur.visibility != null ? Math.round((cur.visibility / 1000) * 10) / 10 : null,
        uvIndex: cur.uv_index != null ? Math.round(cur.uv_index * 10) / 10 : null,
      },
      sun: {
        sunrise: daily[0]?.sunrise ?? null,
        sunset: daily[0]?.sunset ?? null,
      },
      hourly,
      daily,
      tips: [],
    };
    card.tips = buildTips(card);

    return {
      context: buildNarrativeContext(card),
      weatherCard: card,
      sources: [
        {
          index: 1,
          filename: `Weather · ${label}`,
          excerpt: `${card.current.condition}, ${card.current.temp}${unit} · 7-day + hourly`,
          url: "https://open-meteo.com/",
        },
      ],
    };
  } catch (e) {
    console.warn("weather lookup failed:", e instanceof Error ? e.message : e);
    return { context: null, sources: [], weatherCard: null };
  }
}
