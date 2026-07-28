import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider
} from "@kloud-code/shared"
import type { LanguageModel } from "ai";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";

type AnthropicModelId = Extract<SupportedChatModel, { provider: "anthropic" }>["id"]
type OpenAIModelId = Extract<SupportedChatModel, { provider: "openai" }>["id"];



export type ResolvedModel = {
  model: LanguageModel;
  provider: SupportedProvider;
  modelId: SupportedChatModelId;
  maxOutputTokens?: number;
  providerOptions?: {
    openai?: OpenAIResponsesProviderOptions;
    anthropic?: AnthropicProviderOptions;
  };
};

const ANTHROPIC_PROVIDER_OPTIONS: Partial<Record<AnthropicModelId, AnthropicProviderOptions>> = {
  "claude-opus-4-6": {
    thinking: {
      type: "adaptive",
      display: "summarized",
    },
    effort: "medium",
  },
  "claude-sonnet-4-6": {
    thinking: {
      type: "adaptive",
      display: "summarized",
    },
    effort: "medium",
  },
}

const GPT54_REASONING_OPTIONS: OpenAIResponsesProviderOptions = {
  reasoningSummary: "auto",
};

const OPENAI_REASONING_OPTIONS: OpenAIResponsesProviderOptions = {
  reasoningSummary: "auto",
};

const OPENAI_PROVIDER_OPTIONS: Partial<Record<OpenAIModelId, OpenAIResponsesProviderOptions>> = {
  "gpt-5.4": GPT54_REASONING_OPTIONS,
  "gpt-5.4-mini": GPT54_REASONING_OPTIONS,
  "gpt-5.4-nano": GPT54_REASONING_OPTIONS,
  "gpt-5-mini": OPENAI_REASONING_OPTIONS,
  "o4-mini": OPENAI_REASONING_OPTIONS,
}


function assertUnsupportedProvider(provider: never): never {
  throw new Error(`Unsupported provider: ${provider}`)
}


function resolveAnthropicModel(modelId: AnthropicModelId): ResolvedModel {
  const options = ANTHROPIC_PROVIDER_OPTIONS[modelId];
  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
    providerOptions: options ? { anthropic: options } : undefined,
  }
};
function resolveOpenAIModel(modelId: OpenAIModelId): ResolvedModel {
  const options = OPENAI_PROVIDER_OPTIONS[modelId];
  return {
    model: openai(modelId),
    provider: "openai",
    modelId,
    providerOptions: options ? { openai: options } : undefined,
  }
};

function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
  const provider = model.provider;

  switch (provider) {
    case "anthropic":
      return resolveAnthropicModel(model.id)
    case "openai":
      return resolveOpenAIModel(model.id)
    default:
      return assertUnsupportedProvider(provider)
  };
}
export function isSupportedChatModel(modelId: string): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) != null;
};

export function resolveChatModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId);
  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }
  return resolveSupportedChatModel(model);
};
