import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KundliChart } from "../components/KundliChart";
import { MarkdownMessage } from "../components/MarkdownMessage";
import { advancedApi } from "../lib/advanced";
import { catalogApi } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { toolsApi, type HoroscopeChart } from "../lib/tools";

const SUN_SIGNS = [
  { name: "Aries", range: "21 Mar – 19 Apr" },
  { name: "Taurus", range: "20 Apr – 20 May" },
  { name: "Gemini", range: "21 May – 20 Jun" },
  { name: "Cancer", range: "21 Jun – 22 Jul" },
  { name: "Leo", range: "23 Jul – 22 Aug" },
  { name: "Virgo", range: "23 Aug – 22 Sep" },
  { name: "Libra", range: "23 Sep – 22 Oct" },
  { name: "Scorpio", range: "23 Oct – 21 Nov" },
  { name: "Sagittarius", range: "22 Nov – 21 Dec" },
  { name: "Capricorn", range: "22 Dec – 19 Jan" },
  { name: "Aquarius", range: "20 Jan – 18 Feb" },
  { name: "Pisces", range: "19 Feb – 20 Mar" },
] as const;

export function HoroscopePage() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("1995-07-14");
  const [time, setTime] = useState("15:20");
  const [place, setPlace] = useState("London, UK");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [chart, setChart] = useState<HoroscopeChart | null>(null);
  const [readingText, setReadingText] = useState("");
  const [astrologyPrompt, setAstrologyPrompt] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    catalogApi
      .get()
      .then((c) => {
        const a = c.assistants.find((x) => x.id === "astrology");
        if (a?.systemPrompt) setAstrologyPrompt(a.systemPrompt);
      })
      .catch(() => {});
  }, []);

  const generateChart = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setReadingText("");
    abortRef.current?.abort();
    try {
      const data = await toolsApi.horoscopeChart({
        name: name.trim() || undefined,
        date,
        time,
        place: place.trim(),
      });
      setChart(data);
    } catch (e) {
      setChart(null);
      setError(friendlyError(e instanceof Error ? e.message : "CHART_FAILED", "Could not build chart"));
    } finally {
      setLoading(false);
    }
  };

  const runDeepReading = async () => {
    if (!chart || reading) return;
    setReading(true);
    setError("");
    setReadingText("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const message = [
      `Give me a deep advanced natal chart reading for ${chart.name || "this native"}.`,
      "",
      chart.readingContext,
      "",
      "Cover love, career, money, health/energy, timing, dasha flavour, and practical guidance. Use the chart data above as ground truth.",
    ].join("\n");

    try {
      let full = "";
      for await (const chunk of advancedApi.streamRespond(
        {
          message,
          routerMode: "advanced",
          systemPrompt: astrologyPrompt,
          preferredLanguage: "auto",
        },
        { signal: abortRef.current.signal, timeoutMs: 150_000 },
      )) {
        if (typeof chunk === "string") {
          full += chunk;
          setReadingText(full);
        }
      }
      if (!full.trim()) {
        setError("Reading came back empty — try again in a moment.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "STREAM_FAILED";
      if (msg !== "ABORTED") {
        setError(friendlyError(msg, "Could not generate reading"));
      }
    } finally {
      setReading(false);
    }
  };

  const openSunSignReading = (sign: string) => {
    try {
      sessionStorage.setItem(
        "libraix_prefill",
        `Give me a deep advanced daily + weekly horoscope for ${sign}. Cover love, career, money, energy, and timing.`,
      );
      sessionStorage.setItem("libraix_assistant", "astrology");
    } catch {
      /* ignore */
    }
    window.location.href = "/app";
  };

  return (
    <div className="horoscope-page">
      <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Chat
      </Link>

      <header className="horoscope-hero">
        <p className="section-label">Astrology</p>
        <h1>Horoscope chart</h1>
        <p className="tagline">
          Enter birth date, time, and place for a free Vedic kundli — planets, houses, nakshatras, and Vimshottari dasha —
          then a deep Libraix reading. Inspired by classic online horoscope charts.
        </p>
      </header>

      <section className="horoscope-form-panel" aria-label="Birth details">
        <h2>Birth details</h2>
        <div className="horoscope-form-grid">
          <label>
            Full name <span className="dim">(optional)</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
          <label>
            Date of birth
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Time of birth
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>
          <label className="horoscope-place-field">
            Birth city
            <input
              className="input"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="City, Country"
              required
            />
          </label>
        </div>
        <div className="horoscope-form-actions">
          <button className="btn btn-primary" disabled={loading || !date || !time || !place.trim()} onClick={() => void generateChart()}>
            {loading ? "Calculating…" : "Generate kundli"}
          </button>
          {chart && (
            <button className="btn btn-ghost" disabled={reading} onClick={() => void runDeepReading()}>
              {reading ? "Writing reading…" : "Deep AI reading"}
            </button>
          )}
        </div>
        <p className="dim horoscope-hint">
          Accurate Lagna needs a correct birth time and place. Chart uses Lahiri (sidereal) ayanamsa — Vedic style, not tropical Western.
        </p>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {chart && (
        <section className="horoscope-result" aria-label="Chart result">
          <div className="horoscope-snapshot">
            <div>
              <h2>{chart.name || "Your chart"}</h2>
              <p className="dim">
                {chart.birth.date} · {chart.birth.time} · {chart.birth.place}
              </p>
            </div>
            <div className="horoscope-badges">
              <span className="badge badge-beta">{chart.system}</span>
              <span className="badge">Ayanamsa {chart.ayanamsa.formatted}</span>
            </div>
          </div>

          <div className="horoscope-core-grid">
            <div className="horoscope-core-item">
              <span className="dim">Lagna</span>
              <strong>
                {chart.lagna
                  ? `${chart.lagna.rashi} / ${chart.lagna.rashiWestern} ${chart.lagna.degree}`
                  : "—"}
              </strong>
              {chart.lagna && (
                <em>
                  {chart.lagna.nakshatra} · pada {chart.lagna.pada}
                </em>
              )}
            </div>
            <div className="horoscope-core-item">
              <span className="dim">Moon</span>
              <strong>
                {chart.moonSign.rashi} / {chart.moonSign.rashiWestern}
              </strong>
              <em>
                {chart.moonSign.nakshatra} · pada {chart.moonSign.pada}
              </em>
            </div>
            <div className="horoscope-core-item">
              <span className="dim">Sun</span>
              <strong>
                {chart.sunSign.rashi} / {chart.sunSign.rashiWestern}
              </strong>
              <em>
                {chart.sunSign.nakshatra} · pada {chart.sunSign.pada}
              </em>
            </div>
            <div className="horoscope-core-item">
              <span className="dim">Current dasha</span>
              <strong>{chart.currentDasha?.lord ?? "—"}</strong>
              {chart.currentDasha && (
                <em>
                  until {chart.currentDasha.endDate.slice(0, 10)}
                </em>
              )}
            </div>
          </div>

          <KundliChart chart={chart} />

          <h3>Planetary positions</h3>
          <div className="horoscope-table-wrap">
            <table className="horoscope-table">
              <thead>
                <tr>
                  <th>Planet</th>
                  <th>Sign</th>
                  <th>Degree</th>
                  <th>Nakshatra</th>
                  <th>Pada</th>
                  <th>House</th>
                </tr>
              </thead>
              <tbody>
                {chart.planets.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.short}</strong> {p.name}
                    </td>
                    <td>
                      {p.rashi} <span className="dim">({p.rashiWestern})</span>
                    </td>
                    <td>{p.degree}</td>
                    <td>{p.nakshatra}</td>
                    <td>{p.pada}</td>
                    <td>{p.house ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {chart.dashas.length > 0 && (
            <>
              <h3>Vimshottari dasha</h3>
              <ul className="horoscope-dasha-list">
                {chart.dashas.map((d) => (
                  <li key={`${d.lord}-${d.startDate}`}>
                    <strong>{d.lord}</strong>
                    <span className="dim">
                      {" "}
                      {d.startDate.slice(0, 10)} → {d.endDate.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {(reading || readingText) && (
            <div className="horoscope-reading">
              <h3>Deep reading</h3>
              <div className="horoscope-reading-body">
                <MarkdownMessage content={readingText || "Thinking…"} streaming={reading} />
              </div>
              {reading && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    abortRef.current?.abort();
                    setReading(false);
                  }}
                >
                  Stop
                </button>
              )}
            </div>
          )}

          <p className="dim horoscope-disclaimer">
            Guidance and reflection only — not medical, legal, or financial advice. Predictions are not guaranteed.
          </p>
        </section>
      )}

      <section className="horoscope-sunsigns" aria-label="Sun sign horoscopes">
        <h2>Sun sign horoscopes</h2>
        <p className="tagline">Quick Western sun-sign readings in chat — or generate a full kundli above for Vedic depth.</p>
        <div className="horoscope-sign-grid">
          {SUN_SIGNS.map((s) => (
            <button key={s.name} type="button" className="horoscope-sign-chip" onClick={() => openSunSignReading(s.name)}>
              <strong>{s.name}</strong>
              <span>{s.range}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
