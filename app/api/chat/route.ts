import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { requireAuth } from "@/lib/middleware/auth";

export const POST = requireAuth(async (req, user) => {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash-exp"),
    messages,
    // Gemini doesn't need explicit tools configuration for web search
    // It has built-in grounding capabilities
  });

  return result.toDataStreamResponse();
});
