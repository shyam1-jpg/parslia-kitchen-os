import { getModelById } from "../config/models.js";
import { ProviderError } from "../providers/types.js";
import { getUsage, recordImageUsage, canGenerateImage } from "./usage.js";
import type { SafeUser } from "./users.js";

/** Download remote image bytes once and embed as a data URL so chat shows it instantly (ChatGPT-style). */
async function toEmbeddedDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Cap ~2.5MB so SQLite message storage stays sane
  if (buf.length > 2_500_000) return url;
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Pollinations.ai — free, no API key, no account needed.
 * Used as primary path when OpenAI billing is not set up,
 * or as automatic fallback when OpenAI image generation fails.
 * Embeds bytes as data URL so the picture appears in chat without a second download/click.
 */
async function generateWithPollinations(prompt: string, size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024"): Promise<string> {
  const [width, height] = size.split("x").map(Number);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&nologo=true&model=flux&enhance=true`;
  return toEmbeddedDataUrl(url);
}

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
  const size = req.size ?? "1024x1024";

  // If no OpenAI key at all, go straight to the free provider
  if (!apiKey) {
    return generateWithFreeProvider(user, req, catalogModel, size);
  }

  const speed: ImageSpeed =
    req.speed ?? (process.env.OPENAI_IMAGE_SPEED === "quality" ? "quality" : "fast");
  const timeoutMs = speed === "fast" ? 45_000 : 90_000;
  let lastError = "Image generation failed";
  let billingIssue = false;

  for (const modelName of imageModelsToTry(speed)) {
    try {
      const res = await fetch(IMAGES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildImageBody(modelName, { ...req, speed })),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          data?: { url?: string; b64_json?: string; revised_prompt?: string }[];
        };
        const image = data.data?.[0];
        if (!image) { lastError = "No image returned"; continue; }

        let url = image.url ?? (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null);
        if (!url) { lastError = "No image URL in response"; continue; }
        // Embed remote OpenAI URLs so the picture stays visible in chat (signed URLs expire)
        try {
          url = await toEmbeddedDataUrl(url);
        } catch {
          /* keep original URL if embed fails */
        }

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
        const parsed = JSON.parse(errText) as { error?: { message?: string } };
        lastError = parsed.error?.message ?? errText.slice(0, 300);
      } catch {
        lastError = errText.slice(0, 300);
      }

      if (res.status === 429 && /rate/i.test(lastError)) {
        throw new ProviderError("OpenAI rate limit hit. Wait a moment and try again.", "openai", "RATE_LIMIT", false);
      }
      if (/billing|payment|quota|insufficient|access/i.test(lastError)) {
        billingIssue = true;
        break; // No point trying other OpenAI models — fall through to free provider
      }

      const tryNext = /does not exist|not found|invalid model|unknown model|unsupported/i.test(lastError) || res.status === 404;
      if (!tryNext) break;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      lastError = e instanceof Error ? e.message : "Request failed";
      if (/timeout|abort/i.test(lastError)) break;
      break;
    }
  }

  // Fall back to free Pollinations.ai provider (no API key needed)
  console.log("OpenAI image failed, falling back to Pollinations.ai:", lastError);
  return generateWithFreeProvider(user, req, catalogModel, size);
}

async function generateWithFreeProvider(
  user: SafeUser,
  req: ImageGenerateRequest,
  catalogModel: NonNullable<ReturnType<typeof getModelById>>,
  size: string
): Promise<ImageGenerateResponse> {
  const validSize = (["1024x1024", "1792x1024", "1024x1792"] as const).includes(size as never)
    ? (size as "1024x1024" | "1792x1024" | "1024x1792")
    : "1024x1024";
  try {
    const url = await generateWithPollinations(req.prompt, validSize);
    recordImageUsage(user.id);
    return {
      url,
      modelId: catalogModel.id,
      displayName: "Libraix Image",
      provider: "pollinations",
      imageModel: "flux",
      speed: req.speed ?? "fast",
    };
  } catch (e) {
    throw new ProviderError(
      "Image generation failed. Please try again.",
      "pollinations",
      "PROVIDER_ERROR",
      false
    );
  }
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
