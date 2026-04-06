import fs from "node:fs";
import path from "node:path";
import type { OpenClawPluginDefinition } from "../../src/plugins/types.js";

export default {
  id: "dynamic-router",
  name: "Dynamic Router",
  description: "Routes first message to a heavy model, fallback to light model.",
  register: (api) => {
    api.registerHook("before_model_resolve", (event, ctx) => {
      // If we don't have a session ID, we assume it's the first message
      if (!ctx.sessionId) {
        api.logger.info("[dynamic-router] No sessionId, forcing gemma4:31b");
        return {
          modelOverride: "gemma4:31b",
          providerOverride: "ollama",
        };
      }

      const sessionFile = path.join(ctx.agentDir || "", "..", "sessions", `${ctx.sessionId}.jsonl`);

      let isFirstAssistantReply = true;
      if (fs.existsSync(sessionFile)) {
        const content = fs.readFileSync(sessionFile, "utf-8");
        // Count how many assistant messages exist in the session
        // (A simple string check is robust enough for jsonl logs)
        if (content.includes('"role":"assistant"')) {
          isFirstAssistantReply = false;
        }
      }

      if (isFirstAssistantReply) {
        api.logger.info(
          `[dynamic-router] Session ${ctx.sessionId} has no prior assistant replies. Forcing gemma4:31b.`,
        );
        return {
          modelOverride: "gemma4:31b",
          providerOverride: "ollama",
        };
      }

      api.logger.info(
        `[dynamic-router] Session ${ctx.sessionId} already has assistant replies. Falling back to default (26b).`,
      );
      return {};
    });
  },
} satisfies OpenClawPluginDefinition;
