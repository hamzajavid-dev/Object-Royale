import { NextResponse } from "next/server";
import { buildNarratePrompt, cleanLine, fallbackLine, type NarrateInput } from "@/lib/narrate";

export const runtime = "nodejs";
export const maxDuration = 10;

const MODEL = process.env.OPENROUTER_NARRATE_MODEL || "google/gemini-2.5-flash-lite";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidInput(body: unknown): body is NarrateInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;

  const requiredStrings: (keyof NarrateInput)[] = [
    "attackerName",
    "attackerObject",
    "defenderName",
    "defenderObject",
    "moveName",
    "moveDescription",
  ];
  const requiredNumbers: (keyof NarrateInput)[] = ["damage", "attackerHpPct", "defenderHpPct", "moveNumber"];
  const requiredBooleans: (keyof NarrateInput)[] = ["superEffective", "crit", "ko"];

  for (const key of requiredStrings) {
    if (!isNonEmptyString(b[key])) return false;
  }
  for (const key of requiredNumbers) {
    if (!isFiniteNumber(b[key])) return false;
  }
  for (const key of requiredBooleans) {
    if (typeof b[key] !== "boolean") return false;
  }
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidInput(body)) {
    return NextResponse.json({ error: "Invalid narration input" }, { status: 400 });
  }

  const input = body;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // No key configured — the game must never break because of narration.
    return NextResponse.json({ line: fallbackLine(input), source: "fallback" });
  }

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
        model: MODEL,
        max_tokens: 80,
        temperature: 1.0,
        reasoning: { enabled: false },
        messages: [{ role: "user", content: buildNarratePrompt(input) }],
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn(`narrate: openrouter responded with status ${res.status}`);
      return NextResponse.json({ line: fallbackLine(input), source: "fallback" });
    }

    const data: unknown = await res.json();
    const content = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || content.trim().length === 0) {
      console.warn("narrate: empty or missing content in openrouter response");
      return NextResponse.json({ line: fallbackLine(input), source: "fallback" });
    }

    return NextResponse.json({ line: cleanLine(content), source: "ai" });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.warn(`narrate: request failed (${reason})`);
    return NextResponse.json({ line: fallbackLine(input), source: "fallback" });
  }
}
