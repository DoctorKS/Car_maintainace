/* eslint-disable */
// @ts-nocheck — Supabase Edge Functions run on Deno; deno-style imports
// are intentional and won't typecheck under the project's tsconfig.

/**
 * supabase/functions/ocr-receipt/index.ts
 *
 * Server-side proxy for the Anthropic vision API. Client uploads a
 * receipt blob (base64) + mime; we call claude-sonnet-4-6 with a Thai
 * structured-extraction prompt and return strict JSON
 *   { items: [{ partName, quantity, unitPrice }, ...] }
 *
 * The Anthropic API key lives in `ANTHROPIC_API_KEY` Supabase secret —
 * never reaches the browser. JWT verification is on by default
 * (configure with `verify_jwt: true` in the function settings), so this
 * endpoint only runs for signed-in users.
 *
 * Deploy / set secret:
 *
 *   supabase functions deploy ocr-receipt
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-4-6";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = [
  "You are an OCR assistant for Thai automobile maintenance receipts.",
  "Extract every line-item part purchased from the image.",
  "",
  "Output ONLY a JSON array. No prose, no markdown, no code fences.",
  "Each element MUST be an object of shape:",
  '  { "partName": string, "quantity": number, "unitPrice": number }',
  "",
  "Rules:",
  "1. partName — Thai or English, as printed on the receipt; do not translate.",
  "2. quantity — numeric, default 1 if unclear.",
  "3. unitPrice — price PER UNIT in THB (Thai Baht), numeric only — no commas, no symbol.",
  "4. If only the row total is shown, compute unitPrice = total / quantity.",
  "5. Skip rows that are not parts: VAT, subtotal, grand total, address,",
  "   dates, shop name, signatures, headers, page numbers.",
  "6. Skip labour / service / ค่าแรง lines UNLESS they have a clear unit price.",
  "7. If no parsable items are found, return [].",
  "",
  "Begin output now:",
].join("\n");

interface AnthropicMessage {
  content: Array<{ type: string; text?: string }>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY secret not set on the project" }),
      { status: 500, headers: { ...CORS_HEADERS, "content-type": "application/json" } },
    );
  }

  let imageBase64: string;
  let mimeType: string;
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";
    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      throw new Error("missing imageBase64");
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: `Bad request: ${String(e)}` }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  // Call Anthropic
  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Anthropic fetch failed: ${String(e)}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(
      JSON.stringify({ error: `Anthropic ${upstream.status}: ${errText.slice(0, 500)}` }),
      { status: 502, headers: { ...CORS_HEADERS, "content-type": "application/json" } },
    );
  }

  const data = (await upstream.json()) as AnthropicMessage;
  const textBlocks = (data.content ?? []).filter((b) => b.type === "text");
  const raw = textBlocks
    .map((b) => b.text ?? "")
    .join("\n")
    .trim();

  // Claude sometimes wraps JSON in ```json fences despite the instruction —
  // strip them defensively.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  let items: Array<{ partName: string; quantity: number; unitPrice: number }>;
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    items = parsed
      .map((it: { partName?: string; quantity?: number; unitPrice?: number }) => ({
        partName: String(it.partName ?? "").trim(),
        quantity: Number(it.quantity ?? 1),
        unitPrice: Number(it.unitPrice ?? 0),
      }))
      .filter((it: { partName: string }) => it.partName.length > 0);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Could not parse model output as JSON: ${String(e)}`, raw }),
      { status: 502, headers: { ...CORS_HEADERS, "content-type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ items }), {
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
});
