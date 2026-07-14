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

const MARKER = "<!--libraix-weather:";

export function encodeWeatherMarker(card: WeatherCardData): string {
  return `${MARKER}${btoa(unescape(encodeURIComponent(JSON.stringify(card))))}-->`;
}

export function extractWeatherCard(content: string): { text: string; weather?: WeatherCardData } {
  const start = content.indexOf(MARKER);
  if (start === -1) return { text: content };
  const end = content.indexOf("-->", start);
  if (end === -1) return { text: content };
  const raw = content.slice(start + MARKER.length, end);
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const weather = JSON.parse(json) as WeatherCardData;
    const text = (content.slice(0, start) + content.slice(end + 3)).trim();
    return { text, weather };
  } catch {
    return { text: content };
  }
}
