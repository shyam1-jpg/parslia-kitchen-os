const ERROR_LABELS: Record<string, string> = {
  INVALID_CREDENTIALS: "Incorrect email or password.",
  EMAIL_EXISTS: "An account with this email already exists.",
  INVALID_INPUT: "Please check your input and try again.",
  UNAUTHENTICATED: "Please sign in to continue.",
  USAGE_LIMIT_REACHED: "Daily message limit reached. Upgrade to Pro for more.",
  RATE_LIMIT: "OpenAI rate limit reached. Please wait a moment and try again.",
  PROVIDER_ERROR: "AI service error. Try again in a moment.",
  PROVIDER_UNAVAILABLE: "AI service is temporarily unavailable. Please try again shortly.",
  IMAGE_LIMIT_REACHED: "Daily image limit reached. Upgrade to Pro for more images.",
  MODELS_UNAVAILABLE: "Selected models are not available. Add API keys on Render or pick OpenAI models only.",
  FEATURE_DISABLED: "This feature requires a Pro plan.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  HTTP_502: "Connection timed out. Try a shorter message or wait a few seconds and retry.",
  HTTP_503: "Service temporarily unavailable. Please try again shortly.",
  ABORTED: "Stopped.",
  REQUEST_TIMED_OUT: "Reply timed out. The server may be waking up — tap send again in a few seconds.",
};

export function friendlyError(code: string, fallback?: string): string {
  if (code.startsWith("HTTP_")) {
    return ERROR_LABELS[code] ?? "Connection error. Please try again.";
  }
  return ERROR_LABELS[code] ?? fallback ?? code;
}

export async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { error?: string; detail?: string; message?: string };
    if (body.error && body.detail) return `${body.error}: ${body.detail}`;
    return body.error ?? body.message ?? `HTTP_${res.status}`;
  } catch {
    return res.status === 502 ? "HTTP_502" : res.status === 503 ? "HTTP_503" : `HTTP_${res.status}`;
  }
}
