import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY n'est pas configuré.");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function douaneModel(): string {
  return process.env.OPENAI_DOUANE_MODEL || "gpt-4o-mini";
}

export function confidenceThreshold(): number {
  const raw = process.env.DOUANE_CONFIDENCE_THRESHOLD;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0.85;
}
