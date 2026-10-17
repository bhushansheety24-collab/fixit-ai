/**
 * AI provider abstraction.
 *
 * Supports any OpenAI-compatible chat-completions endpoint that accepts
 * multimodal (vision) messages. When `AI_API_KEY` is not configured the
 * module falls back to a **clearly labelled mock provider** so the app can
 * run locally without paid credentials.
 *
 * Security: API keys are read exclusively from server-side environment
 * variables and are never sent to the browser.
 */

import {
  aiAnalysisSchema,
  type AIAnalysis,
} from "@/lib/ai/schemas";

export type AIProviderName = "openai-compatible" | "mock";

export interface AnalyzeItemInput {
  category: string;
  itemName: string;
  brand?: string | null;
  model?: string | null;
  purchasePrice?: number | null;
  itemAge?: number | null;
  condition?: string | null;
  problemDescription: string;
  symptoms?: string | null;
  warrantyInfo?: string | null;
  imageUrls: string[];
  currency?: string;
}

export interface AnalysisResult {
  analysis: AIAnalysis;
  provider: AIProviderName;
  model: string;
}

export interface TroubleshootMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TroubleshootInput {
  analysisContext: string;
  messages: TroubleshootMessage[];
}

export class AIProviderError extends Error {
  code:
    | "NO_KEY"
    | "TIMEOUT"
    | "RATE_LIMIT"
    | "PROVIDER_ERROR"
    | "MALFORMED_RESPONSE"
    | "ABORTED";
  status?: number;
  retryable: boolean;

  constructor(
    message: string,
    code: AIProviderError["code"],
    options?: { status?: number; retryable?: boolean },
  ) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

export function isMockMode(): boolean {
  return !process.env.AI_API_KEY;
}

export function getAIProviderName(): AIProviderName {
  return isMockMode() ? "mock" : "openai-compatible";
}

function getAIConfig() {
  return {
    apiKey: process.env.AI_API_KEY,
    baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    ),
    model: process.env.AI_MODEL || "gpt-4o-mini",
  };
}

const ANALYSIS_SYSTEM_PROMPT = `You are FixIt AI, an expert repair assessor.
You analyse photographs and symptom descriptions of damaged or broken household
items and return a STRUCTURED repair assessment.

CRITICAL RULES:
- Distinguish clearly between what is VISIBLE in images and what is a POSSIBLE CAUSE.
- Never claim to definitively diagnose a physical problem from an image alone.
- If the images are missing, blurry, or unrelated, set "insufficientEvidence": true
  and use severity/repairability "unknown". Do NOT invent findings.
- Cost values are rough ESTIMATES, not verified quotes. Never present them as facts.
- Repairability and costs must be plausible for the given currency and region.
- For dangerous items (electrical mains, batteries, gas, vehicle safety systems,
  structural) add explicit safetyWarnings telling the user to seek a qualified
  professional and avoid DIY.
- Respond with a single JSON object matching the requested schema. No markdown.

Return JSON with exactly these keys:
{
  "itemCategory": string,
  "identifiedItem": string,
  "visibleDamage": string[],
  "possibleCauses": [{ "cause": string, "confidence": number /* 0..1 */ }],
  "severity": "minor"|"moderate"|"major"|"critical"|"unknown",
  "confidence": number /* 0..1 overall */,
  "repairability": "likely_repairable"|"possibly_repairable"|"unlikely_repairable"|"not_repairable"|"unknown",
  "estimatedRepairCost": { "min": number|null, "max": number|null, "currency": string },
  "estimatedReplacementCost": { "min": number|null, "max": number|null, "currency": string },
  "recommendedActions": string[],
  "safetyWarnings": string[],
  "professionalSpecialization": string|null,
  "sustainabilityAdvice": string,
  "insufficientEvidence": boolean,
  "disclaimer": string
}`;

const TROUBLESHOOT_SYSTEM_PROMPT = `You are FixIt AI's troubleshooting assistant, helping a user
troubleshoot a specific item based on a prior damage analysis report.
- Be practical, concise and structured.
- Clearly label uncertain guidance ("this may be...", "if you're unsure...").
- Never claim a repair is guaranteed to succeed.
- NEVER give dangerous DIY repair instructions for high-voltage electrical systems,
  damaged lithium batteries, gas appliances, or vehicle safety systems. Instead,
  explain the risk and recommend a qualified professional.
- When relevant, mention tools and estimated costs.
- Keep replies under ~250 words unless asked for more detail.`;

/* ------------------------------------------------------------------ */
/* Low level fetch with timeout + error mapping                        */
/* ------------------------------------------------------------------ */

async function callChatCompletion(body: unknown, timeoutMs: number) {
  const { apiKey, baseUrl } = getAIConfig();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 429) {
      throw new AIProviderError(
        "The AI provider is rate limiting requests. Please retry shortly.",
        "RATE_LIMIT",
        { status: 429, retryable: true },
      );
    }
    if (!res.ok) {
      await res.text().catch(() => "");
      throw new AIProviderError(
        `AI provider returned ${res.status}.`,
        "PROVIDER_ERROR",
        { status: res.status, retryable: res.status >= 500 },
      );
    }

    return (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
  } catch (err) {
    if (err instanceof AIProviderError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AIProviderError(
        "The AI provider timed out. Please try again.",
        "TIMEOUT",
        { retryable: true },
      );
    }
    throw new AIProviderError(
      "Could not reach the AI provider. Please try again.",
      "PROVIDER_ERROR",
      { retryable: true },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Safe JSON extraction: handles ```json fences and leading/trailing prose. */
export function safeParseJSON(raw: string): unknown {
  if (!raw) throw new AIProviderError("Empty AI response.", "MALFORMED_RESPONSE");
  let text = raw.trim();
  // strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(text);
  } catch {
    // attempt to grab the first {...} block
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AIProviderError(
      "AI returned a malformed response.",
      "MALFORMED_RESPONSE",
      { retryable: true },
    );
  }
}

/* ------------------------------------------------------------------ */
/* Mock provider (localhost only, clearly labelled)                    */
/* ------------------------------------------------------------------ */

function buildMockAnalysis(input: AnalyzeItemInput): AIAnalysis {
  const currency = input.currency || "INR";
  const price = input.purchasePrice ?? null;
  const base = price && price > 0 ? price : 3000;

  return {
    itemCategory: input.category,
    identifiedItem: input.itemName || `Unidentified ${input.category}`,
    visibleDamage: [
      "[DEMO DATA] Example observation generated locally — no real image was analysed.",
    ],
    possibleCauses: [
      {
        cause:
          "[DEMO DATA] Example probable cause. Configure AI_API_KEY for real analysis.",
        confidence: 0.5,
      },
    ],
    severity: "moderate",
    confidence: 0,
    repairability: "possibly_repairable",
    estimatedRepairCost: {
      min: Math.round(base * 0.15),
      max: Math.round(base * 0.45),
      currency,
    },
    estimatedReplacementCost: {
      min: Math.round(base * 0.8),
      max: Math.round(base * 1.2),
      currency,
    },
    recommendedActions: [
      "[DEMO DATA] Inspect the item closely and describe the symptoms.",
      "[DEMO DATA] Get a quote from a qualified repair professional.",
    ],
    safetyWarnings: [],
    professionalSpecialization: `${input.category} repair`,
    sustainabilityAdvice:
      "[DEMO DATA] Repairing is usually better for the environment than replacing. Configure the AI provider for real advice.",
    insufficientEvidence: true,
    disclaimer:
      "DEMO MODE — This is a simulated response generated locally because no AI provider is configured. It is NOT a real AI analysis.",
  };
}

function buildMockReply(input: TroubleshootInput): string {
  const last = [...input.messages].reverse().find((m) => m.role === "user");
  return [
    "[DEMO MODE] This is a simulated assistant reply — no AI provider is configured.",
    "",
    `You asked: "${last?.content ?? ""}"`,
    "",
    "Once AI_API_KEY is set, FixIt AI will give real context-aware troubleshooting guidance here. In the meantime:",
    "- Inspect the item carefully and note any sounds, smells, or heat.",
    "- For electrical, battery, gas, or vehicle safety issues, contact a qualified professional.",
    "- Get a repair quote before deciding to replace the item.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function analyzeItem(
  input: AnalyzeItemInput,
  options?: { timeoutMs?: number },
): Promise<AnalysisResult> {
  const { model } = getAIConfig();

  if (isMockMode()) {
    return {
      analysis: buildMockAnalysis(input),
      provider: "mock",
      model: "mock-local",
    };
  }

  const currency = input.currency || "INR";
  const details = [
    `Category: ${input.category}`,
    `Item name: ${input.itemName}`,
    input.brand ? `Brand: ${input.brand}` : null,
    input.model ? `Model: ${input.model}` : null,
    input.purchasePrice != null
      ? `Approx purchase price: ${input.purchasePrice} ${currency}`
      : null,
    input.itemAge != null ? `Approx age (months): ${input.itemAge}` : null,
    input.condition ? `Condition: ${input.condition}` : null,
    `Problem description: ${input.problemDescription}`,
    input.symptoms ? `Symptoms: ${input.symptoms}` : null,
    input.warrantyInfo ? `Warranty info: ${input.warrantyInfo}` : null,
    `Please respond using currency: ${currency}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const imageContent = input.imageUrls.slice(0, 4).map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const body = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: details },
          ...(imageContent.length
            ? imageContent
            : [
                {
                  type: "text" as const,
                  text: "NOTE: No images were provided. Set insufficientEvidence=true.",
                },
              ]),
        ],
      },
    ],
  };

  const json = await callChatCompletion(body, options?.timeoutMs ?? 45_000);
  const rawContent = json.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new AIProviderError(
      "AI returned an empty response.",
      "MALFORMED_RESPONSE",
      { retryable: true },
    );
  }

  const parsed = safeParseJSON(rawContent);
  const validated = aiAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AIProviderError(
      "AI returned a response that failed validation.",
      "MALFORMED_RESPONSE",
      { retryable: true },
    );
  }

  return { analysis: validated.data, provider: "openai-compatible", model };
}

/** Non-streaming troubleshooting reply (returns full text). */
export async function troubleshoot(
  input: TroubleshootInput,
  options?: { timeoutMs?: number },
): Promise<{ content: string; provider: AIProviderName; model: string }> {
  const { model } = getAIConfig();

  if (isMockMode()) {
    return {
      content: buildMockReply(input),
      provider: "mock",
      model: "mock-local",
    };
  }

  const body = {
    model,
    temperature: 0.4,
    messages: [
      { role: "system", content: TROUBLESHOOT_SYSTEM_PROMPT },
      {
        role: "system",
        content: `Item analysis report context:\n${input.analysisContext}`,
      },
      ...input.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };

  const json = await callChatCompletion(body, options?.timeoutMs ?? 45_000);
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AIProviderError(
      "AI returned an empty response.",
      "MALFORMED_RESPONSE",
      { retryable: true },
    );
  }
  return { content, provider: "openai-compatible", model };
}
