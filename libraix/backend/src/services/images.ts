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
  imageModel?: string;
}

function imageModelsToTry(): string[] {
  const preferred = process.env.OPENAI_MODEL_IMAGE?.trim() || "dall-e-3";
  const chain = [preferred, "dall-e-3", "dall-e-2"];
  return [...new Set(chain)];
}

function buildImageBody(modelName: string, req: ImageGenerateRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: modelName,
    prompt: req.prompt,
    n: 1,
  };

  if (modelName === "dall-e-3") {
    body.size = req.size ?? "1024x1024";
    body.quality = req.quality ?? "standard";
  } else {
    // dall-e-2 only supports square sizes up to 1024
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
      "Set OPENAI_API_KEY on the server for image generation",
      "openai",
      "PROVIDER_UNAVAILABLE",
      false
    );
  }

  let lastError = "Image generation failed";

  for (const modelName of imageModelsToTry()) {
    const res = await fetch(IMAGES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildImageBody(modelName, req)),
      signal: AbortSignal.timeout(120_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        data?: { url?: string; revised_prompt?: string }[];
      };
      const image = data.data?.[0];
      if (!image?.url) {
        lastError = "No image returned from OpenAI";
        continue;
      }

      recordImageUsage(user.id);

      return {
        url: image.url,
        revisedPrompt: image.revised_prompt,
        modelId: catalogModel.id,
        displayName: catalogModel.displayName,
        provider: catalogModel.provider,
        imageModel: modelName,
      };
    }

    const err = await res.text();
    try {
      const parsed = JSON.parse(err) as { error?: { message?: string } };
      if (parsed.error?.message) lastError = parsed.error.message;
    } catch {
      lastError = err.slice(0, 300);
    }

    const retryable =
      /does not exist|not found|invalid model|unknown model/i.test(lastError) ||
      res.status === 404;
    if (!retryable) break;
  }

  const code = /rate limit/i.test(lastError) ? "RATE_LIMIT" : "PROVIDER_ERROR";
  throw new ProviderError(
    `${lastError}. Confirm OPENAI_API_KEY is a valid OpenAI key with image access.`,
    "openai",
    code,
    false
  );
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
