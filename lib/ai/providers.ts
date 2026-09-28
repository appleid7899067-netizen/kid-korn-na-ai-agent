import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { DEFAULT_TITLE_MODEL, isPuterConfigured } from "./models";

/**
 * Server-only provider registry.
 *
 * Every credential stays in environment variables. The browser receives model
 * metadata only; it never receives an API key. Providers that expose an
 * OpenAI-compatible endpoint can be configured with AI_PROVIDER_CONFIG_JSON.
 *
 * Puter (https://puter.com) is supported natively: set PUTER_AUTH_TOKEN and
 * models with the `puter/` prefix are routed to Puter's OpenAI-compatible
 * endpoint. When a signed-in user has their own Puter token, that token is
 * preferred so each user covers their own AI usage (Puter's User-Pays model).
 */
type ProviderConfig = {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
};

function readProviderConfig(): Record<string, ProviderConfig> {
  const raw = process.env.AI_PROVIDER_CONFIG_JSON;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, ProviderConfig>;
  } catch {
    console.warn("AI_PROVIDER_CONFIG_JSON is not valid JSON; using defaults.");
    return {};
  }
}

const configuredProviders = readProviderConfig();
const providerCache = new Map<string, ReturnType<typeof createOpenAI>>();

function getProvider(name: string) {
  const cached = providerCache.get(name);
  if (cached) {
    return cached;
  }

  const config = configuredProviders[name] ?? {};
  const isDefault = name === "openai";
  const apiKey =
    config.apiKey ??
    (isDefault
      ? (process.env.OPENAI_API_KEY ?? process.env.AI_GATEWAY_API_KEY)
      : undefined);
  const baseURL =
    config.baseURL ??
    (isDefault
      ? (process.env.OPENAI_BASE_URL ??
        (process.env.AI_GATEWAY_API_KEY
          ? "https://ai-gateway.vercel.sh/v1"
          : undefined))
      : undefined);

  if (!apiKey && !process.env.AI_GATEWAY_API_KEY) {
    throw new Error(
      "No AI credential configured. Set PUTER_AUTH_TOKEN (Puter), OPENAI_API_KEY or AI_PROVIDER_CONFIG_JSON."
    );
  }

  const provider = createOpenAI({
    ...(apiKey ? { apiKey } : {}),
    ...(baseURL ? { baseURL } : {}),
    ...(config.headers ? { headers: config.headers } : {}),
  });
  providerCache.set(name, provider);
  return provider;
}

const puterClientCache = new Map<string, ReturnType<typeof createOpenAI>>();

function resolvePuterCredential(puterToken?: string | null) {
  const config = configuredProviders.puter ?? {};
  const apiKey =
    puterToken ?? process.env.PUTER_AUTH_TOKEN ?? config.apiKey ?? undefined;
  const baseURL =
    config.baseURL ??
    process.env.PUTER_BASE_URL ??
    "https://api.puter.com/puterai/openai/v1/";
  return { apiKey, baseURL };
}

function getPuterProvider(apiKey: string, baseURL: string) {
  const cacheKey = `${apiKey}@${baseURL}`;
  const cached = puterClientCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const provider = createOpenAI({ apiKey, baseURL });
  puterClientCache.set(cacheKey, provider);
  return provider;
}

function hasDefaultOpenAICredential() {
  return Boolean(
    process.env.OPENAI_API_KEY ??
      process.env.AI_GATEWAY_API_KEY ??
      configuredProviders.openai?.apiKey
  );
}

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

function parseModelId(modelId: string) {
  const [providerName, ...modelParts] = modelId.split("/");
  return {
    modelName: modelParts.join("/") || providerName,
    providerName: modelParts.length > 0 ? providerName : "openai",
  };
}

export type ModelCallOptions = {
  /** Per-user Puter token (User-Pays model); falls back to PUTER_AUTH_TOKEN. */
  puterToken?: string | null;
};

export function getLanguageModel(
  modelId: string,
  options: ModelCallOptions = {}
) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const { modelName, providerName } = parseModelId(modelId);
  const puter = resolvePuterCredential(options.puterToken);

  // `puter/...` models — and legacy `openai/...` ids when only Puter is
  // configured — go through Puter's OpenAI-compatible endpoint.
  const usePuter =
    Boolean(puter.apiKey) &&
    (providerName === "puter" ||
      (providerName === "openai" &&
        !hasDefaultOpenAICredential() &&
        isPuterConfigured));

  if (usePuter) {
    return getPuterProvider(puter.apiKey as string, puter.baseURL)(modelName);
  }

  return getProvider(providerName)(modelName);
}

export function getTitleModel(puterToken?: string | null) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return getLanguageModel(process.env.AI_TITLE_MODEL ?? DEFAULT_TITLE_MODEL, {
    puterToken,
  });
}

export function getConfiguredProviderNames() {
  return Object.keys(configuredProviders);
}
