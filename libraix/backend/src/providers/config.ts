const PROVIDER_KEY_ENV: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
  ollama: "OLLAMA_API_KEY",
};

/** True when the provider has an API key configured (OpenAI always shown — dev fallback). */
export function isProviderConfigured(provider: string): boolean {
  if (provider === "openai") return true;
  if (provider === "ollama") {
    return Boolean(process.env.OLLAMA_BASE_URL?.trim() || process.env.OLLAMA_API_KEY?.trim());
  }
  const envKey = PROVIDER_KEY_ENV[provider];
  return envKey ? Boolean(process.env[envKey]?.trim()) : false;
}

export function listConfiguredProviders(): string[] {
  return Object.keys(PROVIDER_KEY_ENV).filter(isProviderConfigured);
}
