const ERROR_LABELS: Record<string, string> = {
  INVALID_CREDENTIALS: "Incorrect email or password.",
  EMAIL_EXISTS: "An account with this email already exists.",
  INVALID_INPUT: "Please check your input and try again.",
  UNAUTHENTICATED: "Please sign in to continue.",
  USAGE_LIMIT_REACHED: "Daily message limit reached. Upgrade to Pro for more.",
  PROVIDER_ERROR: "AI service error. Try again in a moment.",
  PROVIDER_UNAVAILABLE: "AI is in demo mode — add OPENAI_API_KEY on the server for live responses.",
  FEATURE_DISABLED: "This feature requires a Pro plan.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

export function friendlyError(code: string, fallback?: string): string {
  return ERROR_LABELS[code] ?? fallback ?? code;
}
