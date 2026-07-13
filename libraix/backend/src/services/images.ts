import { getModelById } from "../config/models.js";
import { ProviderError } from "../providers/types.js";
import { getUsage, recordImageUsage, canGenerateImage } from "./usage.js";
import type { SafeUser } from "./users.js";

const IMAGES_URL = "https://api.openai.com/v1/images/generations";

export interface ImageGenerateRequest {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
}

export interface ImageGenerateResponse {
  url: string;
  revisedPrompt?: string;
  modelId: string;
  displayName: string;
  provider: string;
}

export async function generateImage(user: SafeUser, req: ImageGenerateRequest): Promise<ImageGenerateResponse> {
  if (!canGenerateImage(user.id, user.plan)) {
    throw new Error("IMAGE_LIMIT_REACHED");
  }

  const model = getModelById("libraix-image");
  if (!model) throw new Error("IMAGE_MODEL_UNAVAILABLE");

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new ProviderError(
      "Set OPENAI_API_KEY on the server for image generation",
      "openai",
      "PROVIDER_UNAVAILABLE",
      false
    );
  }

  const res = await fetch(IMAGES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model.providerModelId,
      prompt: req.prompt,
      n: 1,
      size: req.size ?? "1024x1024",
      quality: req.quality ?? "standard",
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text();
    let detail = err.slice(0, 300);
    try {
      const parsed = JSON.parse(err) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      /* use raw */
    }
    const code = res.status === 429 ? "RATE_LIMIT" : res.status >= 500 ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR";
    throw new ProviderError(detail, "openai", code, res.status >= 500 || res.status === 429);
  }

  const data = (await res.json()) as {
    data?: { url?: string; revised_prompt?: string }[];
  };
  const image = data.data?.[0];
  if (!image?.url) throw new ProviderError("No image returned", "openai", "PROVIDER_ERROR", true);

  recordImageUsage(user.id);

  return {
    url: image.url,
    revisedPrompt: image.revised_prompt,
    modelId: model.id,
    displayName: model.displayName,
    provider: model.provider,
  };
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
