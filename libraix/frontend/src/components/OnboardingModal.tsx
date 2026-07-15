import { useMemo, useState } from "react";
import { BRAND } from "../lib/brand";
import { SPEECH_LANGUAGE_OPTIONS } from "../lib/language";

const STORAGE_KEY = "libraix_onboarded_v1";

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface OnboardingModalProps {
  assistants: Array<{ id: string; name: string }>;
  onComplete: (opts: { assistantId: string; language: string }) => void;
}

export function OnboardingModal({ assistants, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [assistantId, setAssistantId] = useState("");
  const [language, setLanguage] = useState("auto");

  const picks = useMemo(() => {
    const featured = ["coding", "writing", "business", "astrology"];
    const ordered = [
      ...featured.map((id) => assistants.find((a) => a.id === id)).filter(Boolean),
      ...assistants.filter((a) => !featured.includes(a.id)),
    ] as Array<{ id: string; name: string }>;
    return ordered.slice(0, 6);
  }, [assistants]);

  const finish = () => {
    markOnboardingComplete();
    onComplete({ assistantId, language });
  };

  return (
    <div className="onboard-modal" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-backdrop" />
      <div className="onboard-card">
        {step === 0 && (
          <>
            <p className="onboard-brand">{BRAND.name}</p>
            <h2 id="onboard-title">{BRAND.tagline}</h2>
            <p className="onboard-copy">{BRAND.slogan} Pick a starting point — you can change anything later.</p>
            <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
              Continue
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 id="onboard-title">Choose a companion</h2>
            <p className="onboard-copy">Optional — or skip for a general assistant.</p>
            <div className="onboard-choices">
              <button
                type="button"
                className={`onboard-choice ${assistantId === "" ? "active" : ""}`}
                onClick={() => setAssistantId("")}
              >
                General chat
              </button>
              {picks.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`onboard-choice ${assistantId === a.id ? "active" : ""}`}
                  onClick={() => setAssistantId(a.id)}
                >
                  {a.name}
                </button>
              ))}
            </div>
            <div className="onboard-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 id="onboard-title">Reply language</h2>
            <p className="onboard-copy">Auto detects from what you type, or lock a language.</p>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="auto">Auto detect</option>
              {SPEECH_LANGUAGE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
            <div className="onboard-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={finish}>
                Start chatting
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
