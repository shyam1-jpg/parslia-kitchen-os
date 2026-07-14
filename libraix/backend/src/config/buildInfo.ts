/** Build identity for deploy verification (Render sets RENDER_GIT_COMMIT). */
export function getBuildInfo() {
  return {
    commit: process.env.RENDER_GIT_COMMIT ?? process.env.BUILD_SHA ?? "dev",
    service: "libraix-api",
    features: {
      orchestrator: true,
      asyncFileIndexing: true,
      billingStatus: true,
      catalogCache: true,
      liveWeather: true,
      autoIpLocation: true,
      conversationMemory: true,
    },
  };
}
