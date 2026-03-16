import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { CHARACTER_SETTING } from "@/lib/character";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-pro"),
    system: CHARACTER_SETTING,
    messages,
  });

  return result.toDataStreamResponse();
}
