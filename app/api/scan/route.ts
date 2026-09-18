import { createHash } from "node:crypto";

import type { Arena } from "@/lib/types";
import { SCAN_JSON_SCHEMA, SCAN_PROMPT, extractJson, normalizeArena } from "@/lib/scan";

export const runtime = "nodejs";
export const maxDuration = 30;

// ~4 MB of base64 text, per the budget rules.
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 20;

// In-memory cache so the same photo is never paid for twice while the server
// runs. Keyed by sha256 of the base64 image.
const cache = new Map<string, Arena>();

function cacheSet(key: string, value: Arena): void {
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, value);
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing OPENROUTER_API_KEY" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const image = typeof body === "object" && body !== null ? (body as Record<string, unknown>).image : undefined;
  if (typeof image !== "string" || image.length === 0) {
    return Response.json({ error: "Missing image" }, { status: 400 });
  }

  const base64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  if (base64.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: "Image is too large (max ~4MB)" }, { status: 400 });
  }

  const cacheKey = createHash("sha256").update(base64).digest("hex");
  const cached = cache.get(cacheKey);
  if (cached) {
    return Response.json(cached, { headers: { "x-cache": "hit" } });
  }

  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://object-royale.vercel.app",
        "X-Title": "Object Royale",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2500,
        temperature: 0.9,
        reasoning: { enabled: false },
        response_format: {
          type: "json_schema",
          json_schema: { name: "arena", strict: true, schema: SCAN_JSON_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SCAN_PROMPT },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const detail = res.status === 402 ? "Out of AI credits" : `${res.status} ${errText.slice(0, 200)}`;
      return Response.json({ error: "Scan failed", detail }, { status: 502 });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      usage?: unknown;
    };

    console.log("scan usage", data.usage);

    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error("No content in model response");
    }

    const parsed = extractJson(text);
    const arena = normalizeArena(parsed);

    cacheSet(cacheKey, arena);

    return Response.json(arena);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("scan error:", message);
    return Response.json({ error: "Scan failed", detail: message.slice(0, 200) }, { status: 502 });
  }
}
