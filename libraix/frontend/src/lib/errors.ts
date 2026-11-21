const ERROR_LABELS: Record<string, string> = {
  INVALID_CREDENTIALS: "Incorrect email or password.",
  EMAIL_EXISTS: "An account with this email already exists.",
  INVALID_INPUT: "Please check your input and try again.",
  UNAUTHENTICATED: "Please sign in to continue.",
  USAGE_LIMIT_REACHED: "Daily message limit reached. Pro (£9/mo) adds more messages, all live models, and unlimited Live Voice.",
  RATE_LIMIT: "OpenAI rate limit reached. Please wait a moment and try again.",
  PROVIDER_ERROR: "AI service error. Try again in a moment.",
  PROVIDER_UNAVAILABLE: "AI service is temporarily unavailable. Please try again shortly.",
  IMAGE_LIMIT_REACHED: "Daily image limit reached. Upgrade to Pro for more images.",
  PASSWORD_TOO_SHORT: "Password must be at least 10 characters.",
  PASSWORD_NEED_LETTER: "Password needs at least one letter.",
  PASSWORD_NEED_NUMBER: "Password needs at least one number.",
  BILLING_REQUIRED: "Image generation needs OpenAI billing enabled. Go to platform.openai.com → Billing → add a payment method, then try again.",
  MODELS_UNAVAILABLE: "Selected models are not available. Add API keys on Render or pick OpenAI models only.",
  FEATURE_DISABLED: "This feature requires a Pro plan.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  HTTP_502: "Connection timed out. Try a shorter message or wait a few seconds and retry.",
  HTTP_503: "Service temporarily unavailable. Please try again shortly.",
  ABORTED: "Stopped.",
  REQUEST_TIMED_OUT: "Libraix didn’t hear back in time. Retry — the server may be waking up.",
  NO_TEXT_EXTRACTED_SCANNED_PDF: "This PDF looks scanned (no extractable text). Try a text PDF or DOCX.",
  LEGACY_DOC_UNSUPPORTED: "Legacy .doc isn’t supported — save as .docx or PDF and try again.",
  FILE_TYPE_NOT_SUPPORTED: "Unsupported file type. Use PDF, DOCX, RTF, or text.",
  NO_TEXT_EXTRACTED: "Could not extract text from that file.",
  PDF_PARSE_TIMEOUT: "That PDF took too long to read. Try a smaller file or a text-based PDF.",
  PDF_PARSE_FAILED: "Could not read that PDF. Try another file or export it as text/DOCX.",
  PLACE_NOT_FOUND: "Couldn’t find that birth city — try City, Country (e.g. Mumbai, India).",
  PLACE_REQUIRED: "Enter a birth city or place.",
  INVALID_BIRTH_DATE: "Use a valid birth date (YYYY-MM-DD).",
  INVALID_BIRTH_TIME: "Use a valid birth time (HH:MM).",
  INVALID_YOUTUBE_URL: "That doesn’t look like a YouTube link.",
  NO_TRANSCRIPT: "No captions were found for this video. Try a video with subtitles on.",
  YOUTUBE_PRIVATE: "This video looks private or age-restricted, so captions aren’t available.",
  YOUTUBE_UNAVAILABLE: "YouTube couldn’t play this video (removed or region-locked).",
  YOUTUBE_FAILED: "Couldn’t summarise that video. Try again in a moment.",
  PAGE_TIMEOUT: "That page took too long to load. Try again, or paste the text instead.",
  PAGE_BLOCKED: "The site blocked automated access. Copy the relevant text into chat instead.",
  PAGE_FETCH_FAILED: "Couldn’t fetch that page. Try again in a moment.",
  NO_PAGE_TEXT: "No readable text was found on that page.",
  URL_NOT_ALLOWED: "That link can’t be analysed. Use a public http(s) webpage.",
  INVALID_URL: "That doesn’t look like a valid webpage link.",
  URL_UNREACHABLE: "Couldn’t reach that website. Check the URL and try again.",
  ANALYSIS_FAILED: "Couldn’t analyse that page. Try again in a moment.",
  SEARCH_FAILED: "Web search didn’t return results. Try a shorter query.",
  TOOL_FAILED: "That tool didn’t complete. Try again in a moment.",
};

export function friendlyError(code: string, fallback?: string): string {
  if (code.startsWith("HTTP_")) {
    return ERROR_LABELS[code] ?? "Connection error. Please try again.";
  }
  return ERROR_LABELS[code] ?? fallback ?? code;
}

/** Retry the stream once when no tokens arrived (timeouts, proxy 502s, dropped sockets). */
export function isRetryableStreamError(code: string): boolean {
  return (
    code === "REQUEST_TIMED_OUT" ||
    code === "STREAM_FAILED" ||
    code === "PROVIDER_UNAVAILABLE" ||
    code === "PROVIDER_ERROR" ||
    code.startsWith("HTTP_") ||
    /failed to fetch|network|econnreset|socket/i.test(code)
  );
}

export async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { error?: string; detail?: string; message?: string; hint?: string };
    if (body.hint) return body.hint;
    if (body.error && body.detail) return `${body.error}: ${body.detail}`;
    return body.error ?? body.message ?? `HTTP_${res.status}`;
  } catch {
    return res.status === 502 ? "HTTP_502" : res.status === 503 ? "HTTP_503" : `HTTP_${res.status}`;
  }
}
