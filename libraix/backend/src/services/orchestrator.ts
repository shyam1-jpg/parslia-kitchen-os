import { getModelById } from "../config/models.js";
import { completeWithFallback, streamWithFallback } from "../providers/resilience.js";
import { canSendMessage, getUsage, recordMessageUsage } from "./usage.js";
import { routeModel } from "./router.js";
import { getMemoryContext } from "./memory.js";
import { learnFromConversationTurn } from "./memoryExtract.js";
import { getProjectDocumentContext } from "./projects.js";
import { buildWebSearchBundle } from "./research.js";
import { wantsLiveSources } from "./liveSources.js";
import { getSavedLocation } from "./location.js";
import { buildWeatherContext, isWeatherQuery, type WeatherCardData } from "./weather.js";
import { detectImageRequest } from "./imageIntent.js";
import { generateImage } from "./images.js";
import { detectLanguage, languageReplyInstruction } from "./language.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
import {
  AGENT_SYSTEM,
  formatAgentPlanBlock,
  formatAgentStatus,
  runAgentToolPass,
} from "./agent.js";
import type { SafeUser } from "./users.js";
import type { AiRequest, AiResponse } from "./ai.js";

/** Persist durable facts from this turn for future chats (never blocks the reply path). */
function scheduleMemoryLearn(user: SafeUser, req: AiRequest, assistantContent: string) {
  setImmediate(() => {
    learnFromConversationTurn({
      userId: user.id,
      userPlan: user.plan,
      userMessage: req.message,
      assistantContent,
      projectId: req.projectId,
      conversationId: req.conversationId,
    });
  });
}

const DEFAULT_SYSTEM_PROMPT = `You are Libraix, a fast, capable multilingual AI assistant. Be direct and helpful — like the best version of ChatGPT.

- Answer immediately. No filler, no "Great question!", no "Certainly!".
- Match length to the ask: one sentence for simple questions, structured Markdown for complex ones.
- Layout for reading (the app styles each Markdown role differently):
  - Use short paragraphs (2–4 sentences). Put a blank line between ideas.
  - For longer answers: a clear ## heading, then sections. Use ### for sub-points when useful.
  - Prefer bullet or numbered lists for steps, options, and takeaways — not walls of text.
  - Use **bold** sparingly for key terms; *italics* for soft emphasis.
  - Use > blockquotes for a single memorable line, warning, or pull-quote — not whole answers.
  - Fenced code blocks with a language tag for any code; tables when comparing 3+ items.
- For code: complete working examples, brief inline comments only where non-obvious.
- Be honest about uncertainty. Ask at most one clarifying question.
- Do not mention being an AI unless asked.
- Images are handled automatically — never tell users to search elsewhere.
- When live weather/search data is provided, use the actual numbers. Never say you can't access real-time data.
- Use User memory naturally to personalise replies. Don't recite the list.
- Always reply in the same language the user used (Hindi, Tamil, Spanish, Arabic, English, etc.). Sound natural and human in that language.`;

export interface TurnContext {
  systemMessages: { role: "system"; content: string }[];
  sources: NonNullable<AiResponse["sources"]>;
  webContext: string | null;
  weatherCard: WeatherCardData | null;
}

export interface ResolvedTurn {
  model: NonNullable<ReturnType<typeof getModelById>>;
  fallback: ReturnType<typeof getModelById>;
  router: ReturnType<typeof routeModel>;
  isPremium: boolean;
}

/** Gather memory, project files, weather, and web search in parallel where possible. */
export async function prepareTurnContext(user: SafeUser, req: AiRequest): Promise<TurnContext> {
  const memoryCtx =
    req.useMemory !== false ? await getMemoryContext(user.id, req.projectId, req.message) : "";
  const wantsWeather = isWeatherQuery(req.message);
  const wantsWeb = wantsLiveSources(req.message, req.routerMode);

  const savedLoc = wantsWeather ? getSavedLocation(user.id) : null;

  const [weatherBundle, webBundle, docBundle] = await Promise.all([
    wantsWeather
      ? buildWeatherContext(req.message, {
          defaultCity: savedLoc?.city ?? null,
          latitude: savedLoc?.latitude ?? null,
          longitude: savedLoc?.longitude ?? null,
          timezone: savedLoc?.timezone ?? null,
          locationLabel: savedLoc?.label ?? null,
        })
      : Promise.resolve({
          context: null as string | null,
          sources: [] as NonNullable<AiResponse["sources"]>,
          weatherCard: null as WeatherCardData | null,
        }),
    wantsWeb
      ? buildWebSearchBundle(req.message)
      : Promise.resolve({ context: null as string | null, sources: [] as NonNullable<AiResponse["sources"]> }),
    req.projectId
      ? getProjectDocumentContext(user.id, req.projectId, req.message)
      : Promise.resolve({ context: "", sources: [] as NonNullable<AiResponse["sources"]> }),
  ]);

  const locationHint =
    savedLoc && wantsWeather
      ? `User home location (from login IP / saved): ${savedLoc.label}. When they ask about "weather" without naming a city, use this place.`
      : null;

  const liveSources = [...weatherBundle.sources, ...webBundle.sources].map((s, i) => ({
    ...s,
    index: docBundle.sources.length + i + 1,
  }));
  const allSources = [...(docBundle.sources ?? []), ...liveSources];

  const forced =
    req.preferredLanguage && req.preferredLanguage !== "auto"
      ? {
          code: req.preferredLanguage,
          name: req.preferredLanguage,
          speechLocale: req.preferredLanguage,
          confidence: "high" as const,
        }
      : detectLanguage(req.message);
  const langHint = languageReplyInstruction(
    req.preferredLanguage && req.preferredLanguage !== "auto"
      ? {
          ...forced,
          name:
            (
              {
                en: "English",
                hi: "Hindi",
                ta: "Tamil",
                te: "Telugu",
                ml: "Malayalam",
                kn: "Kannada",
                bn: "Bengali",
                gu: "Gujarati",
                pa: "Punjabi",
                mr: "Marathi",
                ur: "Urdu",
                ar: "Arabic",
                zh: "Chinese",
                ja: "Japanese",
                ko: "Korean",
                es: "Spanish",
                fr: "French",
                de: "German",
                pt: "Portuguese",
                it: "Italian",
                ru: "Russian",
              } as Record<string, string>
            )[req.preferredLanguage] ?? req.preferredLanguage,
        }
      : forced
  );

  const systemParts = [
    DEFAULT_SYSTEM_PROMPT,
    langHint,
    req.systemPrompt,
    locationHint,
    docBundle.context || null,
    memoryCtx || null,
    weatherBundle.context,
    webBundle.context,
  ].filter(Boolean);

  const systemMessages = systemParts.length
    ? [{ role: "system" as const, content: systemParts.join("\n\n") }]
    : [];

  return {
    systemMessages,
    sources: allSources,
    webContext: webBundle.context,
    weatherCard: weatherBundle.weatherCard,
  };
}

async function prepareContextForRequest(user: SafeUser, req: AiRequest): Promise<TurnContext & { agentStatus?: string }> {
  const isAgent = req.routerMode === "agent" && isFeatureEnabled("multi-agent", user.plan);
  if (!isAgent) {
    return prepareTurnContext(user, req);
  }

  const agentReq: AiRequest = { ...req, routerMode: "agent" };
  const [base, agent] = await Promise.all([prepareTurnContext(user, agentReq), runAgentToolPass(user, agentReq)]);

  const systemMessages = [
    {
      role: "system" as const,
      content: [
        AGENT_SYSTEM,
        formatAgentPlanBlock(agent.plan),
        agent.toolContext,
        ...base.systemMessages.map((m) => m.content),
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  return {
    ...base,
    systemMessages,
    agentStatus: formatAgentStatus(agent.plan),
  };
}

export function resolveTurnModel(user: SafeUser, req: AiRequest): ResolvedTurn {
  const usage = getUsage(user.id, user.plan);
  const premiumRemaining = Math.max(0, usage.premiumLimit - usage.premiumUsed);

  const router = routeModel({
    message: req.message,
    mode: req.routerMode ?? "auto",
    userPlan: user.plan,
    manualModelId: req.modelId,
    premiumRemaining,
  });

  let model = getModelById(router.modelId);
  if (!model) throw new Error("MODEL_NOT_FOUND");
  if (!model.enabled) throw new Error("MODEL_DISABLED");
  if (!model.capabilities.chat) throw new Error("MODEL_NOT_CHAT");

  let isPremium = model.tier !== "free";
  if (!canSendMessage(user.id, user.plan, isPremium)) {
    if (isPremium) {
      const fallbackModel = getModelById("libraix-fast") ?? getModelById("libraix-deepseek");
      if (!fallbackModel || !canSendMessage(user.id, user.plan, false)) {
        throw new Error("USAGE_LIMIT_REACHED");
      }
      model = fallbackModel;
      isPremium = false;
    } else {
      throw new Error("USAGE_LIMIT_REACHED");
    }
  }

  const fallback = getModelById("libraix-fast") ?? getModelById("libraix-deepseek");
  return { model, fallback, router, isPremium };
}

export async function tryGenerateChatImage(user: SafeUser, message: string): Promise<AiResponse | null> {
  const prompt = detectImageRequest(message);
  if (!prompt || !isFeatureEnabled("image-studio", user.plan)) return null;

  const image = await generateImage(user, { prompt, speed: "fast", size: "1024x1024" });
  const caption = image.revisedPrompt ? `*${image.revisedPrompt}*` : `*${prompt}*`;
  const modelTag = image.imageModel ?? "dall-e-2";
  return {
    content: `![Generated image](${image.url})\n\nHere's your image.\n\n${caption}`,
    modelId: image.modelId,
    displayName: image.displayName,
    provider: image.provider,
    providerModelId: modelTag,
    imageUrl: image.url,
    type: "image",
  };
}

function buildChatMessages(req: AiRequest, turn: TurnContext) {
  return [
    ...turn.systemMessages,
    ...(req.conversationHistory ?? []),
    { role: "user" as const, content: req.message },
  ];
}

export async function runTurnComplete(user: SafeUser, req: AiRequest): Promise<AiResponse> {
  const imageResult = await tryGenerateChatImage(user, req.message);
  if (imageResult) return imageResult;

  const turn = await prepareContextForRequest(user, req);
  const { model, fallback, router } = resolveTurnModel(user, req);
  const messages = buildChatMessages(req, turn);

  const { response, model: usedModel } = await completeWithFallback(model, fallback, messages);
  const usedPremium = usedModel.tier !== "free";
  recordMessageUsage(user.id, usedPremium, response.tokensUsed, response.estimatedCostCents);
  scheduleMemoryLearn(user, req, response.content);

  const prefix = turn.agentStatus ?? "";
  return {
    content: prefix + response.content,
    modelId: usedModel.id,
    displayName: usedModel.displayName,
    provider: usedModel.provider,
    providerModelId: usedModel.providerModelId,
    tokensUsed: response.tokensUsed,
    router,
    sources: turn.sources.length ? turn.sources : undefined,
    weatherCard: turn.weatherCard ?? undefined,
  };
}

export async function* runTurnStream(
  user: SafeUser,
  req: AiRequest
): AsyncGenerator<
  | string
  | { model: ReturnType<typeof getModelById> }
  | { image: AiResponse }
  | { sources: NonNullable<AiResponse["sources"]> }
  | { weatherCard: WeatherCardData }
> {
  const imagePrompt = detectImageRequest(req.message);
  if (imagePrompt && isFeatureEnabled("image-studio", user.plan)) {
    yield "Rendering your image…\n\n";
    try {
      const imageResult = await tryGenerateChatImage(user, req.message);
      if (imageResult) {
        yield imageResult.content;
        yield { image: imageResult };
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image generation failed";
      yield `Could not generate image: ${msg}\n\nTry **Image Studio** from the sidebar, or check that OPENAI_API_KEY is set on the server.`;
      return;
    }
  }

  const turn = await prepareContextForRequest(user, req);
  const { model, fallback } = resolveTurnModel(user, req);
  const messages = buildChatMessages(req, turn);

  if (turn.agentStatus) yield turn.agentStatus;

  // Send visual weather card before tokens so the UI feels instant
  if (turn.weatherCard) yield { weatherCard: turn.weatherCard };

  let totalLen = 0;
  let fullContent = "";
  let usedModel = model;
  for await (const item of streamWithFallback(model, fallback, messages)) {
    usedModel = item.model;
    totalLen += item.chunk.length;
    fullContent += item.chunk;
    yield item.chunk;
  }
  if (turn.sources.length) yield { sources: turn.sources };
  yield { model: usedModel };
  const usedPremium = usedModel.tier !== "free";
  recordMessageUsage(user.id, usedPremium, Math.ceil(totalLen / 4), 0);
  scheduleMemoryLearn(user, req, fullContent);
}
