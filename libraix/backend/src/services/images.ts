import { getModelById } from "../config/models.js";
import { ProviderError } from "../providers/types.js";
import { getUsage, recordImageUsage, canGenerateImage } from "./usage.js";
import type { SafeUser } from "./users.js";

const IMAGES_URL = "https://api.openai.com/v1/images/generations";

export type ImageSpeed = "fast" | "quality";

export interface ImageGenerateRequest {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  speed?: ImageSpeed;
}

export interface ImageGenerateResponse {
  url: string;
  revisedPrompt?: string;
  modelId: string;
  displayName: string;
  provider: string;
  imageModel?: string;
  speed?: ImageSpeed;
}

/** Models to try in order. gpt-image-1 is newest and most accessible. */
function imageModelsToTry(speed: ImageSpeed): string[] {
  const envFast = process.env.OPENAI_MODEL_IMAGE_FAST?.trim();
  const envQuality = process.env.OPENAI_MODEL_IMAGE?.trim();

  if (speed === "fast") {
    return [...new Set([
      envFast ?? "gpt-image-1",
      "gpt-image-1",
      "dall-e-3",
      "dall-e-2",
      envQuality ?? "dall-e-3",
    ].filter(Boolean))];
  }
  return [...new Set([
    envQuality ?? "gpt-image-1",
    "gpt-image-1",
    "dall-e-3",
    "dall-e-2",
  ].filter(Boolean))];
}

function buildImageBody(modelName: string, req: ImageGenerateRequest & { speed: ImageSpeed }): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: modelName,
    prompt: req.prompt,
    n: 1,
  };

  if (modelName === "gpt-image-1") {
    // gpt-image-1 uses quality field, no explicit size needed for fast
    body.size = req.size ?? "1024x1024";
    body.quality = req.speed === "fast" ? "low" : (req.quality === "hd" ? "high" : "medium");
  } else if (modelName === "dall-e-3") {
    const size = req.size === "1792x1024" || req.size === "1024x1792" ? req.size : "1024x1024";
    body.size = size;
    body.quality = req.quality ?? "standard";
  } else {
    // DALL·E 2: only square sizes
    body.size = "1024x1024";
  }

  return body;
}

export async function generateImage(user: SafeUser, req: ImageGenerateRequest): Promise<ImageGenerateResponse> {
  if (!canGenerateImage(user.id, user.plan)) {
    throw new Error("IMAGE_LIMIT_REACHED");
  }

  const catalogModel = getModelById("libraix-image");
  if (!catalogModel) throw new Error("IMAGE_MODEL_UNAVAILABLE");

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new ProviderError(
      "Image generation needs an OpenAI API key. Add OPENAI_API_KEY on Render.",
      "openai",
      "PROVIDER_UNAVAILABLE",
      false
    );
  }

  const speed: ImageSpeed =
    req.speed ?? (process.env.OPENAI_IMAGE_SPEED === "quality" ? "quality" : "fast");
  const timeoutMs = speed === "fast" ? 45_000 : 90_000;
  let lastError = "Image generation failed";
  let lastStatus = 0;

  for (const modelName of imageModelsToTry(speed)) {
    try {
      const res = await fetch(IMAGES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildImageBody(modelName, { ...req, speed })),
        signal: AbortSignal.timeout(timeoutMs),
      });

      lastStatus = res.status;

      if (res.ok) {
        const data = (await res.json()) as {
          data?: { url?: string; b64_json?: string; revised_prompt?: string }[];
        };
        const image = data.data?.[0];
        if (!image) { lastError = "No image returned"; continue; }

        // gpt-image-1 returns b64_json, convert to data URL
        const url = image.url ?? (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null);
        if (!url) { lastError = "No image URL in response"; continue; }

        recordImageUsage(user.id);
        return {
          url,
          revisedPrompt: image.revised_prompt,
          modelId: catalogModel.id,
          displayName: catalogModel.displayName,
          provider: catalogModel.provider,
          imageModel: modelName,
          speed,
        };
      }

      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText) as { error?: { message?: string; code?: string } };
        lastError = parsed.error?.message ?? errText.slice(0, 300);
      } catch {
        lastError = errText.slice(0, 300);
      }

      // Billing/permission errors are not retryable with a different model
      if (res.status === 429 && /rate/i.test(lastError)) {
        throw new ProviderError("OpenAI rate limit hit. Wait a moment and try again.", "openai", "RATE_LIMIT", false);
      }
      if (res.status === 400 && /billing|payment|quota|insufficient/i.test(lastError)) {
        throw new ProviderError(
          "Image generation requires OpenAI billing enabled. Go to platform.openai.com → Billing → add a payment method, then try again.",
          "openai",
          "BILLING_REQUIRED",
          false
        );
      }

      // Model not found → try next
      const tryNext = /does not exist|not found|invalid model|unknown model|unsupported/i.test(lastError) || res.status === 404;
      if (!tryNext) break;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      lastError = e instanceof Error ? e.message : "Request failed";
      if (/timeout|abort/i.test(lastError)) {
        lastError = "Image took too long — try again.";
        break;
      }
      break;
    }
  }

  // Billing is the most common real-world failure — surface it clearly
  if (/billing|payment|quota|insufficient/i.test(lastError) || lastStatus === 400) {
    throw new ProviderError(
      "Image generation needs OpenAI billing. Go to platform.openai.com → Billing → add a payment method.",
      "openai",
      "BILLING_REQUIRED",
      false
    );
  }

  const code = /rate limit/i.test(lastError) ? "RATE_LIMIT" : "PROVIDER_ERROR";
  throw new ProviderError(lastError, "openai", code, false);
}

export function getImageUsage(user: SafeUser) {
  const usage = getUsage(user.id, user.plan);
  return {
    imagesUsed: usage.imagesUsed,
    imagesLimit: usage.imagesLimit,
    remainingImages: Math.max(0, usage.imagesLimit - usage.imagesUsed),
    canGenerate: canGenerateImage(user.id, user.plan),
  };
}
