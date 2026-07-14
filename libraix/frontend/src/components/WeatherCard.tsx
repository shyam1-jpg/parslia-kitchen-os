import type { WeatherCardData, WeatherIcon } from "../lib/weather";

const ICON: Record<WeatherIcon, string> = {
  clear: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  snow: "❄️",
  storm: "⛈️",
};

function TempSpark({ hours, unit }: { hours: WeatherCardData["hourly"]; unit: string }) {
  if (!hours.length) return null;
  const temps = hours.map((h) => h.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(max - min, 1);
  const w = Math.max(hours.length * 28, 220);
  const h = 72;
  const pts = hours
    .map((hour, i) => {
      const x = (i / Math.max(hours.length - 1, 1)) * (w - 8) + 4;
      const y = h - 10 - ((hour.temp - min) / span) * (h - 24);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="wx-chart">
      <div className="wx-chart-label">Temperature · next {hours.length}h ({unit})</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="wx-spark" preserveAspectRatio="none">
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={pts} className="wx-spark-line" />
        {hours.map((hour, i) => {
          const x = (i / Math.max(hours.length - 1, 1)) * (w - 8) + 4;
          const y = h - 10 - ((hour.temp - min) / span) * (h - 24);
          return <circle key={hour.time} cx={x} cy={y} r="2.5" className="wx-spark-dot" />;
        })}
      </svg>
      <div className="wx-chart-scale">
        <span>{max}{unit}</span>
        <span>{min}{unit}</span>
      </div>
    </div>
  );
}

function PrecipBars({ hours }: { hours: WeatherCardData["hourly"] }) {
  const sample = hours.filter((_, i) => i % 2 === 0).slice(0, 12);
  if (!sample.length) return null;
  return (
    <div className="wx-precip">
      <div className="wx-chart-label">Rain chance</div>
      <div className="wx-precip-bars">
        {sample.map((h) => (
          <div key={h.time} className="wx-precip-col" title={`${h.hourLabel}: ${h.precipProb}%`}>
            <div className="wx-precip-track">
              <div className="wx-precip-fill" style={{ height: `${Math.max(h.precipProb, 4)}%` }} />
            </div>
            <span>{h.hourLabel.replace(/\s/g, "")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeatherCard({ data }: { data: WeatherCardData }) {
  const c = data.current;
  return (
    <div className={`weather-card wx-${c.icon}`} aria-label={`Weather for ${data.location}`}>
      <div className="wx-sky" aria-hidden>
        <div className="wx-orb" />
        <div className="wx-cloud wx-cloud-a" />
        <div className="wx-cloud wx-cloud-b" />
        {(c.icon === "rain" || c.icon === "drizzle" || c.icon === "storm") && <div className="wx-rain" />}
      </div>

      <div className="wx-head">
        <div>
          <div className="wx-loc">{data.location}</div>
          <div className="wx-cond">{ICON[c.icon]} {c.condition}</div>
        </div>
        <div className="wx-temp-block">
          <div className="wx-temp">{c.temp}
            <span>{data.units.temp}</span>
          </div>
          <div className="wx-feels">Feels {c.feelsLike}{data.units.temp}</div>
        </div>
      </div>

      <div className="wx-stats">
        <div><span>Humidity</span><strong>{c.humidity}%</strong></div>
        <div><span>Wind</span><strong>{c.wind} {data.units.wind}</strong></div>
        {c.windGust != null && <div><span>Gusts</span><strong>{c.windGust}</strong></div>}
        {c.uvIndex != null && <div><span>UV</span><strong>{c.uvIndex}</strong></div>}
        {c.pressure != null && <div><span>Pressure</span><strong>{c.pressure}</strong></div>}
        {c.cloudCover != null && <div><span>Cloud</span><strong>{c.cloudCover}%</strong></div>}
        {data.sun.sunrise && <div><span>Sunrise</span><strong>{data.sun.sunrise}</strong></div>}
        {data.sun.sunset && <div><span>Sunset</span><strong>{data.sun.sunset}</strong></div>}
      </div>

      <TempSpark hours={data.hourly.slice(0, 16)} unit={data.units.temp} />
      <PrecipBars hours={data.hourly} />

      <div className="wx-hourly-scroll">
        {data.hourly.slice(0, 16).map((h) => (
          <div key={h.time} className="wx-hour">
            <span className="wx-hour-t">{h.hourLabel}</span>
            <span className="wx-hour-i">{ICON[h.icon]}</span>
            <strong>{h.temp}°</strong>
            <span className="wx-hour-p">{h.precipProb}%</span>
          </div>
        ))}
      </div>

      <div className="wx-daily">
        {data.daily.map((d) => (
          <div key={d.date} className="wx-day">
            <span className="wx-day-name">{d.weekday}</span>
            <span>{ICON[d.icon]}</span>
            <span className="wx-day-range">
              <strong>{d.high}°</strong>
              <span>{d.low}°</span>
            </span>
            <span className="wx-day-rain">{d.precipProbMax}%</span>
          </div>
        ))}
      </div>

      {data.tips.length > 0 && (
        <ul className="wx-tips">
          {data.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      <div className="wx-attrib">Live data via Open-Meteo · {data.timezone}</div>
    </div>
  );
}
