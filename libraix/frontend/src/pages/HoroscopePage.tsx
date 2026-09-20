import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KundliChart } from "../components/KundliChart";
import { MarkdownMessage } from "../components/MarkdownMessage";
import { advancedApi } from "../lib/advanced";
import { catalogApi } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { toolsApi, type AshtakootMatch, type HoroscopeChart, type HoroscopeMatchResult } from "../lib/tools";

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

type TabId =
  | "chart"
  | "planets"
  | "houses"
  | "dasha"
  | "yogas"
  | "aspects"
  | "navamsa"
  | "drishti"
  | "transit"
  | "reading";
type Mode = "chart" | "match";
type Gender = "unspecified" | "female" | "male" | "other";

type BirthPerson = {
  name: string;
  gender: Gender;
  date: string;
  time: string;
  place: string;
};

const DEFAULT_PERSON_A: BirthPerson = {
  name: "",
  gender: "unspecified",
  date: "1995-07-14",
  time: "15:20",
  place: "London, UK",
};

const DEFAULT_PERSON_B: BirthPerson = {
  name: "",
  gender: "unspecified",
  date: "1997-03-21",
  time: "09:45",
  place: "Mumbai, India",
};

const DRAFT_KEY_V2 = "libraix_horoscope_draft_v2";
const DRAFT_KEY_LEGACY = "libraix_horoscope_draft";

const TOPIC_REPORTS = [
  { id: "full", label: "Full life", prompt: "full natal life reading covering all major areas in depth" },
  { id: "love", label: "Love", prompt: "love, romance, attraction patterns, and relationship timing" },
  { id: "marriage", label: "Marriage", prompt: "marriage, spouse indicators (7th house/lord), timing, and compatibility themes" },
  { id: "career", label: "Career", prompt: "career, vocation, 10th house, status, and professional timing" },
  { id: "finance", label: "Finance", prompt: "money, wealth yogas, 2nd/11th houses, and financial timing" },
  { id: "health", label: "Health", prompt: "vitality, 6th house themes, and energy management (not medical advice)" },
  {
    id: "year",
    label: "Year ahead",
    prompt: "the next 12 months using current mahadasha, antardasha, and planetary weather",
  },
] as const;

const TABS: { id: TabId; label: string }[] = [
  { id: "chart", label: "Kundli" },
  { id: "planets", label: "Planets" },
  { id: "houses", label: "Houses" },
  { id: "dasha", label: "Dasha" },
  { id: "yogas", label: "Yogas" },
  { id: "aspects", label: "Aspects" },
  { id: "navamsa", label: "D9" },
  { id: "drishti", label: "Drishti" },
  { id: "transit", label: "Gochara" },
  { id: "reading", label: "Reading" },
];

const BAND_LABELS: Record<AshtakootMatch["band"], string> = {
  excellent: "Excellent",
  "very-good": "Very good",
  good: "Good",
  acceptable: "Acceptable",
  challenging: "Challenging",
};

function isGender(v: unknown): v is Gender {
  return v === "unspecified" || v === "female" || v === "male" || v === "other";
}

function normalizePerson(raw: unknown, fallback: BirthPerson): BirthPerson {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  return {
    name: typeof o.name === "string" ? o.name : fallback.name,
    gender: isGender(o.gender) ? o.gender : fallback.gender,
    date: typeof o.date === "string" && o.date ? o.date : fallback.date,
    time: typeof o.time === "string" && o.time ? o.time : fallback.time,
    place: typeof o.place === "string" && o.place ? o.place : fallback.place,
  };
}

function birthComplete(p: BirthPerson): boolean {
  return Boolean(p.date && p.time && p.place.trim());
}

function toBirthBody(p: BirthPerson) {
  return {
    name: p.name.trim() || undefined,
    gender: p.gender,
    date: p.date,
    time: p.time,
    place: p.place.trim(),
  };
}

type BirthFieldsProps = {
  person: BirthPerson;
  onChange: (next: BirthPerson) => void;
  idPrefix: string;
};

function BirthFields({ person, onChange, idPrefix }: BirthFieldsProps) {
  const set = <K extends keyof BirthPerson>(key: K, value: BirthPerson[K]) => {
    onChange({ ...person, [key]: value });
  };

  return (
    <div className="horoscope-form-grid">
      <label htmlFor={`${idPrefix}-name`}>
        Full name <span className="dim">(optional)</span>
        <input
          id={`${idPrefix}-name`}
          className="input"
          value={person.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Name"
        />
      </label>
      <label htmlFor={`${idPrefix}-gender`}>
        Gender <span className="dim">(optional)</span>
        <select
          id={`${idPrefix}-gender`}
          className="input"
          value={person.gender}
          onChange={(e) => set("gender", e.target.value as Gender)}
        >
          <option value="unspecified">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label htmlFor={`${idPrefix}-date`}>
        Date of birth
        <input
          id={`${idPrefix}-date`}
          className="input"
          type="date"
          value={person.date}
          onChange={(e) => set("date", e.target.value)}
          required
        />
      </label>
      <label htmlFor={`${idPrefix}-time`}>
        Time of birth
        <input
          id={`${idPrefix}-time`}
          className="input"
          type="time"
          value={person.time}
          onChange={(e) => set("time", e.target.value)}
          required
        />
      </label>
      <label className="horoscope-place-field" htmlFor={`${idPrefix}-place`}>
        Birth city
        <input
          id={`${idPrefix}-place`}
          className="input"
          value={person.place}
          onChange={(e) => set("place", e.target.value)}
          placeholder="Kolkata, India"
          required
        />
      </label>
    </div>
  );
}

function ChartResultPanels({
  chart,
  tab,
  setTab,
  reading,
  readingText,
  readingTitle,
  onStopReading,
  onTopicReading,
  onPrintPdf,
}: {
  chart: HoroscopeChart;
  tab: TabId;
  setTab: (t: TabId) => void;
  reading: boolean;
  readingText: string;
  readingTitle: string;
  onStopReading: () => void;
  onTopicReading: (topic: (typeof TOPIC_REPORTS)[number]) => void;
  onPrintPdf: () => void;
}) {
  return (
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
          {chart.accuracy && (
            <span className="badge badge-accuracy" title={chart.accuracy.notes.join(" · ")}>
              Accuracy {chart.accuracy.label}
              {typeof chart.accuracy.score === "number" ? ` · ${Math.round(chart.accuracy.score)}%` : ""}
            </span>
          )}
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
          <strong>
            {chart.currentPratyantardasha
              ? `${chart.currentPratyantardasha.mahaLord}–${chart.currentPratyantardasha.antarLord}–${chart.currentPratyantardasha.lord}`
              : chart.currentAntardasha
                ? `${chart.currentAntardasha.mahaLord}–${chart.currentAntardasha.lord}`
                : (chart.currentDasha?.lord ?? "—")}
          </strong>
          {chart.currentPratyantardasha ? (
            <em>
              {chart.currentPratyantardasha.startDate.slice(0, 10)} →{" "}
              {chart.currentPratyantardasha.endDate.slice(0, 10)}
            </em>
          ) : chart.currentDasha ? (
            <em>
              {chart.currentDasha.startDate.slice(0, 10)} → {chart.currentDasha.endDate.slice(0, 10)}
            </em>
          ) : null}
        </div>
        <div className="horoscope-core-item">
          <span className="dim">Current antardasha</span>
          <strong>
            {chart.currentAntardasha
              ? `${chart.currentAntardasha.mahaLord}–${chart.currentAntardasha.lord}`
              : "—"}
          </strong>
          {chart.currentAntardasha && (
            <em>
              {chart.currentAntardasha.startDate.slice(0, 10)} → {chart.currentAntardasha.endDate.slice(0, 10)}
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
            onClick={() => onTopicReading(t)}
          >
            {t.label}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onPrintPdf}>
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
                    <th>Retro</th>
                    <th>Combust</th>
                    <th>Nak%</th>
                    <th>Deity</th>
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
                      <td>
                        {p.retrograde ? <span className="badge">R</span> : <span className="dim">—</span>}
                      </td>
                      <td>
                        {p.combust ? (
                          <span className="badge" title={p.combustionOrb != null ? `orb ${p.combustionOrb}` : undefined}>
                            C
                          </span>
                        ) : (
                          <span className="dim">—</span>
                        )}
                      </td>
                      <td className="dim">
                        {typeof p.nakshatraProgress === "number" ? `${p.nakshatraProgress}%` : "—"}
                      </td>
                      <td className="dim">{p.nakshatraDeity ?? "—"}</td>
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
                {chart.currentAntardasha ? (
                  <>
                    {" "}
                    · antardasha: <strong>{chart.currentAntardasha.lord}</strong> until{" "}
                    {chart.currentAntardasha.endDate.slice(0, 10)}
                  </>
                ) : null}
                {chart.currentPratyantardasha ? (
                  <>
                    {" "}
                    · pratyantardasha: <strong>{chart.currentPratyantardasha.lord}</strong> until{" "}
                    {chart.currentPratyantardasha.endDate.slice(0, 10)}
                  </>
                ) : null}
              </p>
            )}
            <h4 className="horoscope-subhead">Mahadasha</h4>
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
            {(chart.antardashas?.length ?? 0) > 0 && (
              <>
                <h4 className="horoscope-subhead">
                  Antardasha
                  {chart.currentDasha ? ` (inside ${chart.currentDasha.lord})` : ""}
                </h4>
                <ul className="horoscope-dasha-list">
                  {chart.antardashas!.map((ad) => {
                    const current =
                      chart.currentAntardasha &&
                      ad.mahaLord === chart.currentAntardasha.mahaLord &&
                      ad.lord === chart.currentAntardasha.lord &&
                      ad.startDate === chart.currentAntardasha.startDate;
                    return (
                      <li
                        key={`${ad.mahaLord}-${ad.lord}-${ad.startDate}`}
                        className={current ? "dasha-current" : ""}
                      >
                        <strong>
                          {ad.mahaLord}–{ad.lord}
                        </strong>
                        <span className="dim">
                          {" "}
                          {ad.startDate.slice(0, 10)} → {ad.endDate.slice(0, 10)} · ~
                          {Math.round(ad.years * 100) / 100}y
                          {current ? " · now" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {(chart.pratyantardashas?.length ?? 0) > 0 && (
              <>
                <h4 className="horoscope-subhead">
                  Pratyantardasha
                  {chart.currentAntardasha
                    ? ` (inside ${chart.currentAntardasha.mahaLord}–${chart.currentAntardasha.lord})`
                    : ""}
                </h4>
                <ul className="horoscope-dasha-list">
                  {chart.pratyantardashas!.map((pd) => {
                    const current =
                      chart.currentPratyantardasha &&
                      pd.mahaLord === chart.currentPratyantardasha.mahaLord &&
                      pd.antarLord === chart.currentPratyantardasha.antarLord &&
                      pd.lord === chart.currentPratyantardasha.lord &&
                      pd.startDate === chart.currentPratyantardasha.startDate;
                    return (
                      <li
                        key={`${pd.mahaLord}-${pd.antarLord}-${pd.lord}-${pd.startDate}`}
                        className={current ? "dasha-current" : ""}
                      >
                        <strong>
                          {pd.mahaLord}–{pd.antarLord}–{pd.lord}
                        </strong>
                        <span className="dim">
                          {" "}
                          {pd.startDate.slice(0, 10)} → {pd.endDate.slice(0, 10)} · ~
                          {Math.round(pd.years * 1000) / 1000}y
                          {current ? " · now" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
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

        {tab === "navamsa" && (
          <div className="horoscope-panel is-active">
            <h3>Navamsa (D9)</h3>
            {!chart.navamsa ? (
              <p className="dim">Navamsa data not available for this chart.</p>
            ) : (
              <>
                <p>
                  D9 Lagna:{" "}
                  <strong>
                    {chart.navamsa.lagna
                      ? `${chart.navamsa.lagna.rashi} / ${chart.navamsa.lagna.rashiWestern} ${chart.navamsa.lagna.degree}`
                      : "—"}
                  </strong>
                </p>
                <h4 className="horoscope-subhead">D9 planets</h4>
                <div className="horoscope-table-wrap">
                  <table className="horoscope-table">
                    <thead>
                      <tr>
                        <th>Planet</th>
                        <th>Sign</th>
                        <th>House</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.navamsa.planets.map((p) => (
                        <tr key={`d9-${p.id}`}>
                          <td>
                            <strong>{p.short}</strong> {p.name}
                          </td>
                          <td>
                            {p.rashi} <span className="dim">({p.rashiWestern})</span>
                          </td>
                          <td>{p.house ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h4 className="horoscope-subhead">D9 houses</h4>
                <ul className="horoscope-dasha-list">
                  {chart.navamsa.houses.map((h) => (
                    <li key={`d9h-${h.number}`}>
                      <strong>H{h.number}</strong> {h.sign}
                      <span className="dim">
                        {" "}
                        · {h.planets.map((p) => p.short).join(" ") || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                {chart.navamsa.note && <p className="dim">{chart.navamsa.note}</p>}
              </>
            )}
          </div>
        )}

        {tab === "drishti" && (
          <div className="horoscope-panel is-active">
            <h3>Vedic drishti</h3>
            <p className="dim">Classical graha aspects — separate from the Western aspects tab.</p>
            {(chart.vedicDrishti?.length ?? 0) === 0 ? (
              <p className="dim">No Vedic drishti returned for this chart.</p>
            ) : (
              <div className="horoscope-table-wrap">
                <table className="horoscope-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Kind</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.vedicDrishti!.map((d, i) => (
                      <tr key={`${d.from}-${d.to}-${d.kind}-${i}`}>
                        <td>
                          <strong>{d.from}</strong>
                        </td>
                        <td>{d.to}</td>
                        <td>{d.kind}</td>
                        <td className="horoscope-theme-cell">{d.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "transit" && (
          <div className="horoscope-panel is-active">
            <h3>Gochara (transits)</h3>
            {!chart.gochara ? (
              <p className="dim">Transit data not available for this chart.</p>
            ) : (
              <>
                <p className="dim">As of {chart.gochara.asOf}</p>
                <div className={`horoscope-yoga-card ${chart.gochara.sadeSati.active ? "present" : "absent"}`}>
                  <div className="horoscope-yoga-head">
                    <strong>Sade Sati</strong>
                    <span className="badge">
                      {chart.gochara.sadeSati.active ? chart.gochara.sadeSati.phase : "Clear"}
                    </span>
                  </div>
                  <p>{chart.gochara.sadeSati.summary}</p>
                </div>
                {chart.gochara.transitMoon && (
                  <p>
                    Transit Moon: <strong>{chart.gochara.transitMoon.rashi}</strong>
                    {chart.gochara.transitMoon.houseFromLagna != null
                      ? ` · H${chart.gochara.transitMoon.houseFromLagna} from Lagna`
                      : ""}
                    {chart.gochara.transitMoon.houseFromMoon != null
                      ? ` · H${chart.gochara.transitMoon.houseFromMoon} from Moon`
                      : ""}
                    {chart.gochara.transitMoon.note ? (
                      <>
                        {" "}
                        <span className="dim">— {chart.gochara.transitMoon.note}</span>
                      </>
                    ) : null}
                  </p>
                )}
                <h4 className="horoscope-subhead">Key transits</h4>
                {(chart.gochara.keyTransits?.length ?? 0) === 0 ? (
                  <p className="dim">No key transits listed.</p>
                ) : (
                  <div className="horoscope-table-wrap">
                    <table className="horoscope-table">
                      <thead>
                        <tr>
                          <th>Planet</th>
                          <th>Sign</th>
                          <th>From Lagna</th>
                          <th>From Moon</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chart.gochara.keyTransits.map((t, i) => (
                          <tr key={`${t.planet}-${i}`}>
                            <td>
                              <strong>{t.planet}</strong>
                            </td>
                            <td>
                              {t.rashi} <span className="dim">({t.rashiWestern})</span>
                            </td>
                            <td>{t.houseFromLagna != null ? `H${t.houseFromLagna}` : "—"}</td>
                            <td>{t.houseFromMoon != null ? `H${t.houseFromMoon}` : "—"}</td>
                            <td className="horoscope-theme-cell">{t.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {chart.gochara.note && <p className="dim">{chart.gochara.note}</p>}
              </>
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
                <button type="button" className="btn btn-ghost btn-sm" onClick={onStopReading}>
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
        {chart.accuracy && (
          <p>
            Accuracy: {chart.accuracy.label}
            {typeof chart.accuracy.score === "number" ? ` (${Math.round(chart.accuracy.score)}%)` : ""}
          </p>
        )}
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
          <li>
            Current antardasha:{" "}
            {chart.currentAntardasha
              ? `${chart.currentAntardasha.mahaLord}–${chart.currentAntardasha.lord} until ${chart.currentAntardasha.endDate.slice(0, 10)}`
              : "—"}
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
        {(chart.antardashas?.length ?? 0) > 0 && (
          <>
            <h3>Antardasha (current mahadasha)</h3>
            <ul>
              {chart.antardashas!.map((ad) => (
                <li key={`pad-${ad.mahaLord}-${ad.lord}-${ad.startDate}`}>
                  {ad.mahaLord}–{ad.lord}: {ad.startDate.slice(0, 10)} → {ad.endDate.slice(0, 10)}
                </li>
              ))}
            </ul>
          </>
        )}
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
  );
}

export function HoroscopePage() {
  const [mode, setMode] = useState<Mode>("chart");
  const [personA, setPersonA] = useState<BirthPerson>(DEFAULT_PERSON_A);
  const [personB, setPersonB] = useState<BirthPerson>(DEFAULT_PERSON_B);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [chart, setChart] = useState<HoroscopeChart | null>(null);
  const [matchResult, setMatchResult] = useState<HoroscopeMatchResult | null>(null);
  const [readingText, setReadingText] = useState("");
  const [readingTitle, setReadingTitle] = useState("Deep reading");
  const [tab, setTab] = useState<TabId>("chart");
  const [astrologyPrompt, setAstrologyPrompt] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const draftHydrated = useRef(false);

  useEffect(() => {
    catalogApi
      .get()
      .then((c) => {
        const a = c.assistants.find((x) => x.id === "astrology");
        if (a?.systemPrompt) setAstrologyPrompt(a.systemPrompt);
      })
      .catch(() => {});

    try {
      const v2 = localStorage.getItem(DRAFT_KEY_V2);
      if (v2) {
        const d = JSON.parse(v2) as {
          mode?: Mode;
          personA?: unknown;
          personB?: unknown;
        };
        if (d.mode === "chart" || d.mode === "match") setMode(d.mode);
        setPersonA(normalizePerson(d.personA, DEFAULT_PERSON_A));
        setPersonB(normalizePerson(d.personB, DEFAULT_PERSON_B));
      } else {
        const legacy = localStorage.getItem(DRAFT_KEY_LEGACY);
        if (legacy) {
          const d = JSON.parse(legacy) as Record<string, unknown>;
          setPersonA(
            normalizePerson(
              {
                name: d.name,
                gender: d.gender,
                date: d.date,
                time: d.time,
                place: d.place,
              },
              DEFAULT_PERSON_A,
            ),
          );
        }
      }
    } catch {
      /* ignore */
    } finally {
      draftHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated.current) return;
    try {
      localStorage.setItem(
        DRAFT_KEY_V2,
        JSON.stringify({ mode, personA, personB }),
      );
    } catch {
      /* ignore */
    }
  }, [mode, personA, personB]);

  const streamReading = async (title: string, message: string) => {
    setReading(true);
    setError("");
    setReadingText("");
    setReadingTitle(title);
    setTab("reading");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

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

  const generateChart = async () => {
    if (loading || !birthComplete(personA)) return;
    setLoading(true);
    setError("");
    setReadingText("");
    setMatchResult(null);
    abortRef.current?.abort();
    try {
      const data = await toolsApi.horoscopeChart(toBirthBody(personA));
      setChart(data);
      setTab("chart");
    } catch (e) {
      setChart(null);
      setError(friendlyError(e instanceof Error ? e.message : "CHART_FAILED", "Could not build chart"));
    } finally {
      setLoading(false);
    }
  };

  const generateMatch = async () => {
    if (loading || !birthComplete(personA) || !birthComplete(personB)) return;
    setLoading(true);
    setError("");
    setReadingText("");
    setChart(null);
    abortRef.current?.abort();
    try {
      const data = await toolsApi.horoscopeMatch({
        personA: toBirthBody(personA),
        personB: toBirthBody(personB),
      });
      setMatchResult(data);
    } catch (e) {
      setMatchResult(null);
      setError(friendlyError(e instanceof Error ? e.message : "MATCH_FAILED", "Could not run match"));
    } finally {
      setLoading(false);
    }
  };

  const runTopicReading = async (topic: (typeof TOPIC_REPORTS)[number]) => {
    if (!chart || reading) return;
    const title = topic.label === "Full life" ? "Full life reading" : `${topic.label} report`;
    const message = [
      `Give me a deep advanced ${topic.prompt} for ${chart.name || "this native"}.`,
      "",
      chart.readingContext,
      "",
      "Use the structured chart as ground truth. Be specific about houses, lords, nakshatras, dignity, dasha, antardasha, and yogas when relevant.",
      "End with practical guidance and one clear takeaway. Not medical, legal, or financial advice.",
    ].join("\n");
    await streamReading(title, message);
  };

  const runMatchReading = async () => {
    if (!matchResult || reading) return;
    const { match, personA: chartA, personB: chartB } = matchResult;
    const message = [
      `Give me a deep Ashtakoot / Guna Milan compatibility reading for ${match.people.a.name} and ${match.people.b.name}.`,
      "",
      match.readingContext,
      "",
      "— Person A chart —",
      chartA.readingContext,
      "",
      "— Person B chart —",
      chartB.readingContext,
      "",
      "Ground the reading in the koota scores, doshas, and Manglik status. Also discuss 7th house, Venus/Jupiter, and current dasha/antardasha themes when relevant.",
      "End with practical guidance and one clear takeaway. Not medical, legal, or financial advice.",
    ].join("\n");
    await streamReading("Match reading", message);
  };

  const openPersonChart = (which: "A" | "B") => {
    if (!matchResult) return;
    const next = which === "A" ? matchResult.personA : matchResult.personB;
    setChart(next);
    setMode("chart");
    setTab("chart");
    setReadingText("");
    setError("");
  };

  const printPdf = () => {
    if (!chart && !matchResult) return;
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  const canSubmit =
    mode === "chart"
      ? birthComplete(personA)
      : birthComplete(personA) && birthComplete(personB);

  const match = matchResult?.match ?? null;

  return (
    <div className="horoscope-page">
      <div className="horoscope-no-print">
        <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          ← Chat
        </Link>
      </div>

      <header className="horoscope-hero">
        <p className="section-label">Vedic astrology</p>
        <h1>Pro kundli & guna milan</h1>
        <p className="tagline">
          Free Vedic kundli with fine detail — dignity, nakshatra lords, house lords, yogas, mahadasha, antardasha &
          pratyantardasha, D9 navamsa, Vedic drishti, gochara transits, Western aspects — plus Ashtakoot (36-guna)
          matching, topic reports, and Print / Save as PDF.
        </p>
      </header>

      <section className="horoscope-form-panel horoscope-no-print" aria-label="Birth details">
        <div className="horoscope-mode-toggle" role="group" aria-label="Horoscope mode">
          <button
            type="button"
            className={`horoscope-mode-btn ${mode === "chart" ? "active" : ""}`}
            onClick={() => switchMode("chart")}
          >
            Kundli chart
          </button>
          <button
            type="button"
            className={`horoscope-mode-btn ${mode === "match" ? "active" : ""}`}
            onClick={() => switchMode("match")}
          >
            Guna milan
          </button>
        </div>

        <h2>{mode === "chart" ? "Birth details" : "Both birth details"}</h2>

        {mode === "chart" ? (
          <BirthFields person={personA} onChange={setPersonA} idPrefix="a" />
        ) : (
          <>
            <div className="horoscope-person-block">
              <h3>Person A</h3>
              <BirthFields person={personA} onChange={setPersonA} idPrefix="a" />
            </div>
            <div className="horoscope-person-block">
              <h3>Person B</h3>
              <BirthFields person={personB} onChange={setPersonB} idPrefix="b" />
            </div>
          </>
        )}

        <div className="horoscope-form-actions">
          {mode === "chart" ? (
            <button
              className="btn btn-primary"
              disabled={loading || !canSubmit}
              onClick={() => void generateChart()}
            >
              {loading ? "Calculating…" : "Generate advanced kundli"}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={loading || !canSubmit}
              onClick={() => void generateMatch()}
            >
              {loading ? "Matching…" : "Run Ashtakoot match"}
            </button>
          )}
          {mode === "chart" && chart && (
            <>
              <button
                className="btn btn-ghost"
                disabled={reading}
                onClick={() => void runTopicReading(TOPIC_REPORTS[0])}
              >
                {reading ? "Writing…" : "Full AI reading"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={printPdf}>
                Print / PDF
              </button>
            </>
          )}
          {mode === "match" && matchResult && (
            <>
              <button className="btn btn-ghost" disabled={reading} onClick={() => void runMatchReading()}>
                {reading ? "Writing…" : "AI match reading"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={printPdf}>
                Print / PDF
              </button>
            </>
          )}
        </div>
        <p className="dim horoscope-hint">
          Accurate Lagna and Moon nakshatra need correct birth time and place. Use modern or historic city names
          (Calcutta → Kolkata, Bombay → Mumbai). Charts use Lahiri (sidereal). Print → “Save as PDF”.
        </p>
      </section>

      {error && <div className="error-banner horoscope-no-print">{error}</div>}

      {mode === "match" && match && matchResult && (
        <section className="horoscope-match-result" aria-label="Match result">
          <div className="horoscope-match-hero">
            <div>
              <p className="section-label">Ashtakoot · {match.maxScore} gunas</p>
              <h2>
                {match.totalScore}/{match.maxScore}
              </h2>
              <p className="dim">
                {Math.round(match.percentage)}% · {BAND_LABELS[match.band]}
              </p>
            </div>
            <div
              className="horoscope-match-meter"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={match.maxScore}
              aria-valuenow={match.totalScore}
              aria-label="Ashtakoot score"
            >
              <div
                className="horoscope-match-meter-fill"
                style={{ width: `${Math.min(100, Math.max(0, match.percentage))}%` }}
              />
            </div>
          </div>

          <p className="horoscope-match-verdict">{match.verdict}</p>
          <p className="dim">{match.accuracyNote}</p>

          <div className="horoscope-match-people">
            <div>
              <strong>{match.people.a.name}</strong>
              <span>
                Moon {match.people.a.rashi} / {match.people.a.rashiWestern}
              </span>
              <span>
                {match.people.a.nakshatra} · pada {match.people.a.pada}
              </span>
            </div>
            <div>
              <strong>{match.people.b.name}</strong>
              <span>
                Moon {match.people.b.rashi} / {match.people.b.rashiWestern}
              </span>
              <span>
                {match.people.b.nakshatra} · pada {match.people.b.pada}
              </span>
            </div>
          </div>

          <h3 className="horoscope-subhead">Kootas</h3>
          <div className="horoscope-table-wrap">
            <table className="horoscope-table">
              <thead>
                <tr>
                  <th>Koota</th>
                  <th>Score</th>
                  <th>A</th>
                  <th>B</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {match.kootas.map((k) => (
                  <tr key={k.id} className={k.ok ? undefined : "koota-weak"}>
                    <td>
                      <strong>{k.name}</strong>
                    </td>
                    <td>
                      {k.score}/{k.maxScore}
                    </td>
                    <td>{k.personA}</td>
                    <td>{k.personB}</td>
                    <td className="horoscope-theme-cell">{k.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="horoscope-subhead">Doshas & Manglik</h3>
          <div className="horoscope-dosha-grid">
            {match.doshas.map((d) => (
              <div key={d.id} className={`horoscope-yoga-card ${d.active ? "present" : "absent"}`}>
                <div className="horoscope-yoga-head">
                  <strong>{d.name}</strong>
                  <span className="badge">
                    {d.active ? (d.cancelled ? "Active · cancelled" : "Active") : "Clear"}
                  </span>
                </div>
                <p className="dim">{d.reason}</p>
              </div>
            ))}
            <div
              className={`horoscope-yoga-card ${
                match.manglik.status === "none" ? "absent" : "present"
              } severity-${match.manglik.status === "one-sided" ? "caution" : "notable"}`}
            >
              <div className="horoscope-yoga-head">
                <strong>Manglik</strong>
                <span className="badge">{match.manglik.status}</span>
              </div>
              <p>
                A: {match.manglik.personA ? "Yes" : "No"} · B: {match.manglik.personB ? "Yes" : "No"}
              </p>
              <p className="dim">{match.manglik.note}</p>
            </div>
          </div>

          {matchResult.advanced && (
            <div className="horoscope-advanced-match">
              <h3 className="horoscope-subhead">Beyond Ashtakoot</h3>
              <div className="horoscope-core-grid">
                <div className="horoscope-core-item">
                  <span className="dim">D9 Lagnas</span>
                  <strong>
                    A: {matchResult.advanced.navamsa.lagnaA ?? "—"} · B:{" "}
                    {matchResult.advanced.navamsa.lagnaB ?? "—"}
                  </strong>
                  <em>
                    {matchResult.advanced.navamsa.sameNavamsaLagna ? "Same D9 lagna" : "Different D9 lagnas"}
                    {matchResult.advanced.navamsa.note ? ` · ${matchResult.advanced.navamsa.note}` : ""}
                  </em>
                </div>
                <div className="horoscope-core-item">
                  <span className="dim">7th house</span>
                  <strong>
                    A: {matchResult.advanced.seventhHouse.signA ?? "—"}
                    {matchResult.advanced.seventhHouse.lordA
                      ? ` (lord ${matchResult.advanced.seventhHouse.lordA})`
                      : ""}{" "}
                    · B: {matchResult.advanced.seventhHouse.signB ?? "—"}
                    {matchResult.advanced.seventhHouse.lordB
                      ? ` (lord ${matchResult.advanced.seventhHouse.lordB})`
                      : ""}
                  </strong>
                  <em>
                    {[
                      matchResult.advanced.seventhHouse.planetsA.length
                        ? `A: ${matchResult.advanced.seventhHouse.planetsA.join(", ")}`
                        : null,
                      matchResult.advanced.seventhHouse.planetsB.length
                        ? `B: ${matchResult.advanced.seventhHouse.planetsB.join(", ")}`
                        : null,
                      matchResult.advanced.seventhHouse.note || null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </em>
                </div>
                <div className="horoscope-core-item">
                  <span className="dim">Dasha overlap</span>
                  <strong>
                    A: {matchResult.advanced.dashaOverlap.mahaA ?? "—"}
                    {matchResult.advanced.dashaOverlap.antarA
                      ? `–${matchResult.advanced.dashaOverlap.antarA}`
                      : ""}{" "}
                    · B: {matchResult.advanced.dashaOverlap.mahaB ?? "—"}
                    {matchResult.advanced.dashaOverlap.antarB
                      ? `–${matchResult.advanced.dashaOverlap.antarB}`
                      : ""}
                  </strong>
                  <em>{matchResult.advanced.dashaOverlap.note || "—"}</em>
                </div>
              </div>
            </div>
          )}

          <div className="horoscope-form-actions horoscope-no-print">
            <button className="btn btn-ghost" disabled={reading} onClick={() => void runMatchReading()}>
              {reading ? "Writing…" : "AI match reading"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => openPersonChart("A")}>
              Open A&apos;s kundli
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => openPersonChart("B")}>
              Open B&apos;s kundli
            </button>
            <button className="btn btn-ghost" type="button" onClick={printPdf}>
              Print / PDF
            </button>
          </div>

          {(reading || readingText) && (
            <div className="horoscope-reading horoscope-no-print">
              <h3>{readingTitle}</h3>
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

          <div className="horoscope-print-only">
            <h2>Libraix Ashtakoot report</h2>
            <p>
              {match.people.a.name} × {match.people.b.name} · {match.totalScore}/{match.maxScore} (
              {Math.round(match.percentage)}% · {BAND_LABELS[match.band]})
            </p>
            <p>{match.verdict}</p>
            <p>{match.accuracyNote}</p>
            <h3>Kootas</h3>
            <ul>
              {match.kootas.map((k) => (
                <li key={`pk-${k.id}`}>
                  <strong>
                    {k.name}: {k.score}/{k.maxScore}
                  </strong>{" "}
                  — {k.summary}
                </li>
              ))}
            </ul>
            <h3>Doshas & Manglik</h3>
            <ul>
              {match.doshas.map((d) => (
                <li key={`pd-${d.id}`}>
                  <strong>{d.name}:</strong> {d.active ? (d.cancelled ? "Active (cancelled)" : "Active") : "Clear"} —{" "}
                  {d.reason}
                </li>
              ))}
              <li>
                <strong>Manglik:</strong> {match.manglik.status} — {match.manglik.note}
              </li>
            </ul>
            {readingText && (
              <>
                <h3>{readingTitle}</h3>
                <div className="horoscope-reading-body">
                  <MarkdownMessage content={readingText} />
                </div>
              </>
            )}
          </div>

          <p className="dim horoscope-disclaimer horoscope-no-print">
            Ashtakoot is a Moon-nakshatra screen — not the whole marriage chart. Guidance only.
          </p>
        </section>
      )}

      {mode === "chart" && chart && (
        <ChartResultPanels
          chart={chart}
          tab={tab}
          setTab={setTab}
          reading={reading}
          readingText={readingText}
          readingTitle={readingTitle}
          onStopReading={() => {
            abortRef.current?.abort();
            setReading(false);
          }}
          onTopicReading={(t) => void runTopicReading(t)}
          onPrintPdf={printPdf}
        />
      )}

      <section className="horoscope-sunsigns horoscope-no-print" aria-label="Sun sign horoscopes">
        <h2>Sun sign horoscopes</h2>
        <p className="tagline">
          Quick Western sun-sign readings in chat — or generate a full kundli above for Vedic depth.
        </p>
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
