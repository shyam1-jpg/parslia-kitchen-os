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

type TabId = "chart" | "planets" | "houses" | "dasha" | "yogas" | "aspects" | "reading";

const TOPIC_REPORTS = [
  { id: "full", label: "Full life", prompt: "full natal life reading covering all major areas in depth" },
  { id: "love", label: "Love", prompt: "love, romance, attraction patterns, and relationship timing" },
  { id: "marriage", label: "Marriage", prompt: "marriage, spouse indicators (7th house/lord), timing, and compatibility themes" },
  { id: "career", label: "Career", prompt: "career, vocation, 10th house, status, and professional timing" },
  { id: "finance", label: "Finance", prompt: "money, wealth yogas, 2nd/11th houses, and financial timing" },
  { id: "health", label: "Health", prompt: "vitality, 6th house themes, and energy management (not medical advice)" },
  { id: "year", label: "Year ahead", prompt: "the next 12 months using current dasha and planetary weather" },
] as const;

const TABS: { id: TabId; label: string }[] = [
  { id: "chart", label: "Kundli" },
  { id: "planets", label: "Planets" },
  { id: "houses", label: "Houses" },
  { id: "dasha", label: "Dasha" },
  { id: "yogas", label: "Yogas" },
  { id: "aspects", label: "Aspects" },
  { id: "reading", label: "Reading" },
];

export function HoroscopePage() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"unspecified" | "female" | "male" | "other">("unspecified");
  const [date, setDate] = useState("1995-07-14");
  const [time, setTime] = useState("15:20");
  const [place, setPlace] = useState("London, UK");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [chart, setChart] = useState<HoroscopeChart | null>(null);
  const [readingText, setReadingText] = useState("");
  const [readingTitle, setReadingTitle] = useState("Deep reading");
  const [tab, setTab] = useState<TabId>("chart");
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
    try {
      const saved = localStorage.getItem("libraix_horoscope_draft");
      if (saved) {
        const d = JSON.parse(saved) as {
          name?: string;
          gender?: typeof gender;
          date?: string;
          time?: string;
          place?: string;
        };
        if (d.name) setName(d.name);
        if (d.gender) setGender(d.gender);
        if (d.date) setDate(d.date);
        if (d.time) setTime(d.time);
        if (d.place) setPlace(d.place);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("libraix_horoscope_draft", JSON.stringify({ name, gender, date, time, place }));
    } catch {
      /* ignore */
    }
  }, [name, gender, date, time, place]);

  const generateChart = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setReadingText("");
    abortRef.current?.abort();
    try {
      const data = await toolsApi.horoscopeChart({
        name: name.trim() || undefined,
        gender,
        date,
        time,
        place: place.trim(),
      });
      setChart(data);
      setTab("chart");
    } catch (e) {
      setChart(null);
      setError(friendlyError(e instanceof Error ? e.message : "CHART_FAILED", "Could not build chart"));
    } finally {
      setLoading(false);
    }
  };

  const runTopicReading = async (topic: (typeof TOPIC_REPORTS)[number]) => {
    if (!chart || reading) return;
    setReading(true);
    setError("");
    setReadingText("");
    setReadingTitle(topic.label === "Full life" ? "Full life reading" : `${topic.label} report`);
    setTab("reading");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const message = [
      `Give me a deep advanced ${topic.prompt} for ${chart.name || "this native"}.`,
      "",
      chart.readingContext,
      "",
      "Use the structured chart as ground truth. Be specific about houses, lords, nakshatras, dignity, dasha, and yogas when relevant.",
      "End with practical guidance and one clear takeaway. Not medical, legal, or financial advice.",
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
      if (!full.trim()) setError("Reading came back empty — try again in a moment.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "STREAM_FAILED";
      if (msg !== "ABORTED") setError(friendlyError(msg, "Could not generate reading"));
    } finally {
      setReading(false);
    }
  };

  const printPdf = () => {
    if (!chart) return;
    document.body.classList.add("horoscope-printing");
    window.print();
    window.setTimeout(() => document.body.classList.remove("horoscope-printing"), 800);
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
      <div className="horoscope-no-print">
        <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          ← Chat
        </Link>
      </div>

      <header className="horoscope-hero">
        <p className="section-label">Astrology</p>
        <h1>Advanced horoscope chart</h1>
        <p className="tagline">
          Free Vedic kundli with fine detail — dignity, nakshatra lords, house lords, yogas, dasha, Western aspects —
          plus topic reports and Print / Save as PDF.
        </p>
      </header>

      <section className="horoscope-form-panel horoscope-no-print" aria-label="Birth details">
        <h2>Birth details</h2>
        <div className="horoscope-form-grid">
          <label>
            Full name <span className="dim">(optional)</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
          <label>
            Gender <span className="dim">(optional)</span>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
              <option value="unspecified">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
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
          <button
            className="btn btn-primary"
            disabled={loading || !date || !time || !place.trim()}
            onClick={() => void generateChart()}
          >
            {loading ? "Calculating…" : "Generate advanced kundli"}
          </button>
          {chart && (
            <>
              <button className="btn btn-ghost" disabled={reading} onClick={() => void runTopicReading(TOPIC_REPORTS[0])}>
                {reading ? "Writing…" : "Full AI reading"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={printPdf}>
                Print / PDF
              </button>
            </>
          )}
        </div>
        <p className="dim horoscope-hint">
          Accurate Lagna needs correct birth time and place. Chart uses Lahiri (sidereal). Print opens your browser dialog —
          choose “Save as PDF”.
        </p>
      </section>

      {error && <div className="error-banner horoscope-no-print">{error}</div>}

      {chart && (
        <section className="horoscope-result" aria-label="Chart result">
          <div className="horoscope-snapshot">
            <div>
              <h2>{chart.name || "Your chart"}</h2>
              <p className="dim">
                {chart.birth.date} · {chart.birth.time} · {chart.birth.place}
                {chart.gender !== "unspecified" ? ` · ${chart.gender}` : ""}
              </p>
              <p className="dim horoscope-meta-line">
                {chart.birth.timezone} · UTC{chart.birth.utcOffsetHours >= 0 ? "+" : ""}
                {chart.birth.utcOffsetHours} · lat {chart.birth.latitude.toFixed(2)}, lon{" "}
                {chart.birth.longitude.toFixed(2)}
              </p>
            </div>
            <div className="horoscope-badges">
              <span className="badge badge-beta">{chart.system}</span>
              <span className="badge">Ayanamsa {chart.ayanamsa.formatted}</span>
              {chart.western.bigThree && <span className="badge">Western: {chart.western.bigThree}</span>}
            </div>
          </div>

          <div className="horoscope-core-grid">
            <div className="horoscope-core-item">
              <span className="dim">Lagna</span>
              <strong>
                {chart.lagna ? `${chart.lagna.rashi} / ${chart.lagna.rashiWestern} ${chart.lagna.degree}` : "—"}
              </strong>
              {chart.lagna && (
                <em>
                  {chart.lagna.nakshatra} (lord {chart.lagna.nakshatraLord}) · p{chart.lagna.pada} · {chart.lagna.element}/
                  {chart.lagna.quality}
                </em>
              )}
            </div>
            <div className="horoscope-core-item">
              <span className="dim">Moon</span>
              <strong>
                {chart.moonSign.rashi} / {chart.moonSign.rashiWestern}
              </strong>
              <em>
                {chart.moonSign.nakshatra} (lord {chart.moonSign.nakshatraLord}) · p{chart.moonSign.pada}
              </em>
            </div>
            <div className="horoscope-core-item">
              <span className="dim">Sun</span>
              <strong>
                {chart.sunSign.rashi} / {chart.sunSign.rashiWestern}
              </strong>
              <em>
                {chart.sunSign.nakshatra} (lord {chart.sunSign.nakshatraLord}) · p{chart.sunSign.pada}
              </em>
            </div>
            <div className="horoscope-core-item">
              <span className="dim">Current dasha</span>
              <strong>{chart.currentDasha?.lord ?? "—"}</strong>
              {chart.currentDasha && (
                <em>
                  {chart.currentDasha.startDate.slice(0, 10)} → {chart.currentDasha.endDate.slice(0, 10)}
                </em>
              )}
            </div>
          </div>

          {(chart.balance.dominantElement || chart.balance.dominantModality) && (
            <div className="horoscope-balance">
              <strong>Element mix</strong>
              <span>
                Fire {chart.balance.elements.Fire ?? 0} · Earth {chart.balance.elements.Earth ?? 0} · Air{" "}
                {chart.balance.elements.Air ?? 0} · Water {chart.balance.elements.Water ?? 0}
                {chart.balance.dominantElement ? ` · dominant ${chart.balance.dominantElement}` : ""}
                {chart.balance.dominantModality ? ` · ${chart.balance.dominantModality}` : ""}
              </span>
            </div>
          )}

          <div className="horoscope-topics horoscope-no-print" role="group" aria-label="Topic reports">
            <span className="horoscope-topics-label">Advanced reports</span>
            {TOPIC_REPORTS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={reading}
                onClick={() => void runTopicReading(t)}
              >
                {t.label}
              </button>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={printPdf}>
              Print / PDF
            </button>
          </div>

          <div className="horoscope-tabs horoscope-no-print" role="tablist" aria-label="Chart sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`horoscope-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="horoscope-screen-panels horoscope-no-print">
            {tab === "chart" && (
              <div className="horoscope-panel is-active">
                <KundliChart chart={chart} />
                {chart.western.rising && (
                  <p className="dim">
                    Tropical overlay — Rising {chart.western.rising}
                    {chart.western.midheaven ? ` · MC ${chart.western.midheaven}` : ""}
                  </p>
                )}
              </div>
            )}

            {tab === "planets" && (
              <div className="horoscope-panel is-active">
                <h3>Planetary positions</h3>
                <div className="horoscope-table-wrap">
                  <table className="horoscope-table">
                    <thead>
                      <tr>
                        <th>Planet</th>
                        <th>Sign</th>
                        <th>Degree</th>
                        <th>Nakshatra</th>
                        <th>Lord</th>
                        <th>Pada</th>
                        <th>House</th>
                        <th>Dignity</th>
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
                          <td>{p.nakshatraLord}</td>
                          <td>{p.pada}</td>
                          <td>{p.house ?? "—"}</td>
                          <td>
                            <span className={`dignity dignity-${p.dignity.toLowerCase().replace(/\s+/g, "-")}`}>
                              {p.dignity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "houses" && (
              <div className="horoscope-panel is-active">
                <h3>Bhava (houses)</h3>
                <div className="horoscope-table-wrap">
                  <table className="horoscope-table">
                    <thead>
                      <tr>
                        <th>House</th>
                        <th>Sign</th>
                        <th>Lord</th>
                        <th>Lord in</th>
                        <th>Planets</th>
                        <th>Themes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.houses.map((h) => {
                        const lordRow = chart.houseLords.find((x) => x.house === h.number);
                        return (
                          <tr key={h.number}>
                            <td>
                              <strong>H{h.number}</strong> {h.symbol}
                            </td>
                            <td>
                              {h.sign} <span className="dim">({h.signWestern})</span>
                            </td>
                            <td>{h.lord}</td>
                            <td>{lordRow?.lordHouse != null ? `H${lordRow.lordHouse}` : "—"}</td>
                            <td>{h.planets.map((p) => `${p.short} ${p.degree}`).join(", ") || "—"}</td>
                            <td className="horoscope-theme-cell">{h.meaning}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "dasha" && (
              <div className="horoscope-panel is-active">
                <h3>Vimshottari dasha</h3>
                {chart.currentDasha && (
                  <p>
                    Current mahadasha: <strong>{chart.currentDasha.lord}</strong> until{" "}
                    {chart.currentDasha.endDate.slice(0, 10)}
                  </p>
                )}
                <ul className="horoscope-dasha-list">
                  {chart.dashas.map((d) => {
                    const current =
                      chart.currentDasha &&
                      d.lord === chart.currentDasha.lord &&
                      d.startDate === chart.currentDasha.startDate;
                    return (
                      <li key={`${d.lord}-${d.startDate}`} className={current ? "dasha-current" : ""}>
                        <strong>{d.lord}</strong>
                        <span className="dim">
                          {" "}
                          {d.startDate.slice(0, 10)} → {d.endDate.slice(0, 10)} · ~{Math.round(d.years * 10) / 10}y
                          {current ? " · now" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {tab === "yogas" && (
              <div className="horoscope-panel is-active">
                <h3>Yoga & dosha screen</h3>
                <p className="dim">Automated geometric/classical screens — always read with full chart context.</p>
                <div className="horoscope-yoga-grid">
                  {chart.yogas.map((y) => (
                    <div
                      key={y.id}
                      className={`horoscope-yoga-card ${y.present ? "present" : "absent"} severity-${y.severity}`}
                    >
                      <div className="horoscope-yoga-head">
                        <strong>{y.name}</strong>
                        <span className="badge">{y.present ? "Present" : "Not indicated"}</span>
                      </div>
                      <p>{y.summary}</p>
                      <p className="dim">{y.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "aspects" && (
              <div className="horoscope-panel is-active">
                <h3>Major aspects</h3>
                <p className="dim">Tropical Western aspect overlay — Vedic chart remains primary.</p>
                {chart.aspects.length === 0 ? (
                  <p className="dim">No major aspects returned for this chart.</p>
                ) : (
                  <div className="horoscope-table-wrap">
                    <table className="horoscope-table">
                      <thead>
                        <tr>
                          <th>Aspect</th>
                          <th>Type</th>
                          <th>Orb</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chart.aspects.map((a, i) => (
                          <tr key={`${a.planet1}-${a.planet2}-${i}`}>
                            <td>
                              <strong>
                                {a.planet1} {a.symbol} {a.planet2}
                              </strong>
                            </td>
                            <td>{a.aspect}</td>
                            <td>{a.orb}</td>
                            <td className="horoscope-theme-cell">{a.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === "reading" && (
              <div className="horoscope-panel is-active">
                <div className="horoscope-reading">
                  <h3>{readingTitle}</h3>
                  {!reading && !readingText && (
                    <p className="dim">Choose a topic report above, or run Full AI reading.</p>
                  )}
                  {(reading || readingText) && (
                    <div className="horoscope-reading-body">
                      <MarkdownMessage content={readingText || "Thinking…"} streaming={reading} />
                    </div>
                  )}
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
              </div>
            )}
          </div>

          <div className="horoscope-print-only">
            <h2>Libraix kundli report</h2>
            <p>
              {chart.name || "Native"} · {chart.birth.date} {chart.birth.time} · {chart.birth.place}
            </p>
            <KundliChart chart={chart} />
            <h3>Core placements</h3>
            <ul>
              <li>
                Lagna: {chart.lagna ? `${chart.lagna.rashi} ${chart.lagna.degree} · ${chart.lagna.nakshatra}` : "—"}
              </li>
              <li>
                Moon: {chart.moonSign.rashi} · {chart.moonSign.nakshatra} (lord {chart.moonSign.nakshatraLord})
              </li>
              <li>
                Sun: {chart.sunSign.rashi} · {chart.sunSign.nakshatra}
              </li>
              <li>
                Current dasha: {chart.currentDasha?.lord ?? "—"}
                {chart.currentDasha ? ` until ${chart.currentDasha.endDate.slice(0, 10)}` : ""}
              </li>
            </ul>
            <h3>Planets</h3>
            <table className="horoscope-table">
              <thead>
                <tr>
                  <th>Planet</th>
                  <th>Sign</th>
                  <th>Deg</th>
                  <th>Nakshatra</th>
                  <th>H</th>
                  <th>Dignity</th>
                </tr>
              </thead>
              <tbody>
                {chart.planets.map((p) => (
                  <tr key={`print-${p.id}`}>
                    <td>{p.name}</td>
                    <td>{p.rashi}</td>
                    <td>{p.degree}</td>
                    <td>
                      {p.nakshatra} p{p.pada}
                    </td>
                    <td>{p.house ?? "—"}</td>
                    <td>{p.dignity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Houses</h3>
            <table className="horoscope-table">
              <thead>
                <tr>
                  <th>H</th>
                  <th>Sign</th>
                  <th>Lord</th>
                  <th>Planets</th>
                  <th>Themes</th>
                </tr>
              </thead>
              <tbody>
                {chart.houses.map((h) => (
                  <tr key={`ph-${h.number}`}>
                    <td>{h.number}</td>
                    <td>{h.sign}</td>
                    <td>{h.lord}</td>
                    <td>{h.planets.map((p) => p.short).join(" ") || "—"}</td>
                    <td>{h.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Yogas & screens</h3>
            <ul>
              {chart.yogas.map((y) => (
                <li key={`py-${y.id}`}>
                  <strong>{y.name}:</strong> {y.present ? "Present" : "Not indicated"} — {y.summary}
                </li>
              ))}
            </ul>
            {chart.aspects.length > 0 && (
              <>
                <h3>Major aspects (tropical overlay)</h3>
                <ul>
                  {chart.aspects.slice(0, 12).map((a, i) => (
                    <li key={`pa-${i}`}>
                      {a.planet1} {a.symbol} {a.planet2} ({a.aspect}, {a.orb}) — {a.meaning}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {readingText && (
              <>
                <h3>{readingTitle}</h3>
                <div className="horoscope-reading-body">
                  <MarkdownMessage content={readingText} />
                </div>
              </>
            )}
            <p className="dim">
              Guidance only — not medical, legal, or financial advice. Libraix · {chart.ayanamsa.system}{" "}
              {chart.ayanamsa.formatted}
            </p>
          </div>

          <p className="dim horoscope-disclaimer horoscope-no-print">
            Guidance and reflection only — not medical, legal, or financial advice. Predictions are not guaranteed.
          </p>
        </section>
      )}

      <section className="horoscope-sunsigns horoscope-no-print" aria-label="Sun sign horoscopes">
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
