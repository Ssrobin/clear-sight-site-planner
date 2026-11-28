import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";

const GEMINI_BASE_URL = "https://googleapis.com";
const MODEL = "gemini-2.5-flash";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function buildInstructions() {
  let catalog = "";
  let shop = "";
  try {
    const sb = publicClient();
    const [{ data: products }, { data: s }] = await Promise.all([
      sb.from("products").select("id,name,category,gender,price,old_price,description,frame_shape,stock").eq("is_active", true).limit(80),
      sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    catalog = (products ?? [])
      .map((p) => `- ${p.name} | ${p.category} | for ${p.gender} | Rs ${p.price}${p.old_price ? ` (was Rs ${p.old_price})` : ""} | shape ${p.frame_shape} | ${p.stock > 0 ? "in stock" : "out of stock"} | link /product/${p.id} | ${p.description}`)
      .join("\n");
    if (s) {
      shop = `Address: ${s.address}\nPhone: ${s.phone}\nWhatsApp: ${s.whatsapp}\nEmail: ${s.email}\nHours: ${s.opening_hours}\nDelivery fee: Rs ${s.delivery_fee}\nCurrent offer: ${s.announcement}\nJazzCash: ${s.jazzcash_number}, Easypaisa: ${s.easypaisa_number} (account title ${s.account_title})`;
    }
  } catch (e) {
    console.error("assistant context load failed", e);
  }
  return `You are "Opti", the friendly shopping and eye-care assistant for Optoline, an optical store in Pakistan serving families and everyday glasses wearers.

Reply in the same language and script the customer uses (English, Urdu, or Roman Urdu). Keep answers short, warm and practical — 2 to 6 sentences or a short list.

You can help with: choosing frames by face shape and lifestyle, kids' glasses, sunglasses, blue-light glasses, contact lenses, explaining lens types and coatings in simple words, prices, delivery, payment methods (Cash on Delivery, JazzCash, Easypaisa), returns basics and booking an eye test.

When recommending products, only use products from the catalog below and include their link as a markdown link, e.g. [Harbor Round](/product/<id>). Mention that most frames can be tried with the Virtual Try-On at [/try-on](/try-on). To book an eye test, link [/book](/book). For anything you cannot answer, suggest the "Chat with owner" button at the bottom of the page.

Never give a medical diagnosis. For pain, sudden vision loss, flashes, injury or red painful eyes, tell them to see an eye doctor urgently.

Shop info:
${shop}

Catalog:
${catalog}`;
}

export async function handleChat(request: Request) {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return Response.json({ error: "AI assistant is not configured" }, { status: 500 });

  let messages: UIMessage[];
  try {
    const body = (await request.json()) as { messages?: UIMessage[] };
    if (!Array.isArray(body.messages) || body.messages.length === 0) throw new Error("no messages");
    messages = body.messages.slice(-30);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const instructions = await buildInstructions();
  const provider = createOpenAI({
    baseURL: GEMINI_BASE_URL,
    apiKey,
  });

  const result = streamText({
    model: provider.chat(MODEL),
    system: instructions,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onError: (error) => {
      console.error("assistant stream error", error);
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 429) return "Too many questions right now — please wait a moment and try again.";
      return "Sorry, something went wrong. Please try again.";
    },
  });
}
