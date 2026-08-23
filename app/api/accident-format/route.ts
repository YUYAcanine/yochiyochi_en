import { NextRequest, NextResponse } from "next/server";

type AccidentRow = {
  description_accident: string | null;
};

type HiyariRow = {
  food_name: string;
  detail: string | null;
  created_at: string;
};

type GeminiCase = {
  age?: string;
  item?: string;
  situation?: string;
  source?: "accident report" | "incident";
};

type GeminiResult = {
  overview?: string;
  cases?: GeminiCase[];
  notes?: string[];
};

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type GeminiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ retryDelay?: string }>;
  };
};

class GeminiHttpError extends Error {
  status: number;
  model: string;
  retryAfterMs: number;

  constructor(model: string, status: number, message: string, retryAfterMs = 0) {
    super(message);
    this.name = "GeminiHttpError";
    this.status = status;
    this.model = model;
    this.retryAfterMs = retryAfterMs;
  }
}

const DEFAULT_MODEL = "gemini-2.0-flash";
const WARN_INTERVAL_MS = 60_000;
const DEFAULT_QUOTA_BACKOFF_MS = 60_000;

let quotaBlockedUntil = 0;
let lastWarnAt = 0;
const unsupportedModels = new Set<string>();

function nowMs() {
  return Date.now();
}

function canWarn() {
  const now = nowMs();
  if (now - lastWarnAt < WARN_INTERVAL_MS) return false;
  lastWarnAt = now;
  return true;
}

function parseRetryDelayMs(delay?: string): number {
  if (!delay) return 0;
  const match = delay.trim().match(/^([\d.]+)s$/);
  if (!match) return 0;
  const sec = Number(match[1]);
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  return Math.ceil(sec * 1000);
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function formatResult(result: GeminiResult): string {
  const lines: string[] = [];

  if (result.overview?.trim()) {
    lines.push(`Summary\n${result.overview.trim()}`);
  }

  const cases = (result.cases ?? []).filter(
    (c) => c?.age?.trim() || c?.item?.trim() || c?.situation?.trim()
  );
  if (cases.length > 0) {
    const caseLines = cases.map((c, i) => {
      const age = c.age?.trim() || "age unknown";
      const item = c.item?.trim() || "item unknown";
      const situation = c.situation?.trim() || "situation unknown";
      const source = c.source === "incident" ? "incident" : "accident report";
      return `${i + 1}. A child aged ${age} choked on ${item} while ${situation} (${source})`;
    });
    lines.push(`Choking cases\n${caseLines.join("\n")}`);
  }

  const notes = (result.notes ?? []).map((n) => n?.trim()).filter(Boolean);
  if (notes.length > 0) {
    lines.push(`Notes\n${notes.map((n) => `- ${n}`).join("\n")}`);
  }

  return lines.join("\n\n").trim();
}

function buildPrompt(foodName: string | undefined, accidents: AccidentRow[], hiyari: HiyariRow[]) {
  return [
    "You are an editor of nursery/weaning-food accident records.",
    "Read the input data and organize the following as top priority.",
    "1) A child of what age (years/months)",
    "2) Choked on what",
    "3) Under what circumstances",
    "Rules:",
    "- If age is unknown, set age to \"age unknown\"",
    "- If the choking item is unknown, set item to \"item unknown\"",
    "- If the situation is unknown, set situation to \"situation unknown\"",
    "- Keep speculation to a minimum; base output on the input without asserting facts not present",
    "- cases should contain at most 6 entries",
    '- Output JSON only. Keys are "overview", "cases", "notes"',
    '- source is either "accident report" or "incident"',
    "",
    "Input:",
    JSON.stringify(
      {
        foodName: foodName ?? null,
        accidents,
        hiyari,
      },
      null,
      2
    ),
  ].join("\n");
}

function buildModels() {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
  return [primary, fallback].filter((m): m is string => Boolean(m && m.length > 0));
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<GeminiApiResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const raw = await response.text();
    let retryAfterMs = 0;
    let message = `${response.status} ${response.statusText}`;

    try {
      const body = JSON.parse(raw) as GeminiErrorBody;
      const apiMessage = body.error?.message?.trim();
      if (apiMessage) message = apiMessage;
      const retryDelay = body.error?.details?.find((d) => d.retryDelay)?.retryDelay;
      retryAfterMs = parseRetryDelayMs(retryDelay);
    } catch {
      // ignore parse failure
    }

    throw new GeminiHttpError(model, response.status, message, retryAfterMs);
  }

  return (await response.json()) as GeminiApiResponse;
}

export async function POST(req: NextRequest) {
  try {
    const { foodName, accidents, hiyari } = (await req.json()) as {
      foodName?: string;
      accidents?: AccidentRow[];
      hiyari?: HiyariRow[];
    };

    const inputAccidents = accidents ?? [];
    const inputHiyari = hiyari ?? [];
    if (inputAccidents.length === 0 && inputHiyari.length === 0) {
      return NextResponse.json({ formatted: "" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (canWarn()) console.warn("accident-format: GEMINI_API_KEY is missing");
      return NextResponse.json({ formatted: "" });
    }

    if (nowMs() < quotaBlockedUntil) {
      return NextResponse.json({ formatted: "" });
    }

    const prompt = buildPrompt(foodName, inputAccidents, inputHiyari);
    const models = buildModels().filter((m) => !unsupportedModels.has(m));
    if (models.length === 0) {
      if (canWarn()) console.warn("accident-format: no available Gemini model");
      return NextResponse.json({ formatted: "" });
    }

    let data: GeminiApiResponse | null = null;
    for (const model of models) {
      try {
        data = await callGemini(model, apiKey, prompt);
        break;
      } catch (error) {
        if (error instanceof GeminiHttpError) {
          if (error.status === 429) {
            const backoffMs = Math.max(error.retryAfterMs, DEFAULT_QUOTA_BACKOFF_MS);
            quotaBlockedUntil = nowMs() + backoffMs;
            if (canWarn()) {
              console.warn(
                `accident-format: Gemini quota exceeded; fallback mode until ${new Date(quotaBlockedUntil).toISOString()}`
              );
            }
            break;
          }

          if (error.status === 404) {
            unsupportedModels.add(model);
            if (canWarn()) {
              console.warn(`accident-format: model '${model}' is not available for generateContent`);
            }
            continue;
          }

          if (canWarn()) {
            console.warn(`accident-format: model '${model}' failed (${error.status})`);
          }
          continue;
        }

        if (canWarn()) console.warn("accident-format: Gemini call failed");
      }
    }

    if (!data) {
      return NextResponse.json({ formatted: "" });
    }

    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) {
      return NextResponse.json({ formatted: "" });
    }

    try {
      const parsed = JSON.parse(stripCodeFence(text)) as GeminiResult;
      return NextResponse.json({ formatted: formatResult(parsed) });
    } catch {
      return NextResponse.json({ formatted: stripCodeFence(text) });
    }
  } catch {
    if (canWarn()) console.warn("accident-format: unexpected route error");
    return NextResponse.json({ formatted: "" });
  }
}
