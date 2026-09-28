export const titleModel = {
  description: "Fast model for title generation",
  gatewayOrder: [],
  id: "puter/gpt-4o-mini",
  name: "GPT-4o mini",
  provider: "puter",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

/**
 * True when the app can serve AI through Puter (https://puter.com) — either
 * with the site's PUTER_AUTH_TOKEN or with the signed-in user's own token
 * (Puter's User-Pays model).
 */
export const isPuterConfigured = Boolean(
  process.env.PUTER_AUTH_TOKEN ||
    process.env.AI_PROVIDER_CONFIG_JSON?.includes('"puter"')
);

const puterChatModels: ChatModel[] = [
  {
    description: "โมเดลเร็วสำหรับแชต งานเขียน และการใช้เครื่องมือ",
    id: "puter/gpt-5.4-nano",
    name: "GPT-5.4 nano",
    provider: "puter",
  },
  {
    description: "สมดุลระหว่างความเร็ว ราคา และคุณภาพ",
    id: "puter/gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "puter",
  },
  {
    description: "โมเดลอเนกประสงค์ รองรับภาพและเครื่องมือ",
    id: "puter/gpt-4o",
    name: "GPT-4o",
    provider: "puter",
  },
  {
    description: "โมเดลให้เหตุผลสำหรับงานยาก",
    id: "puter/o4-mini",
    name: "o4-mini",
    provider: "puter",
    reasoningEffort: "medium",
  },
  {
    description: "Claude Sonnet จาก Anthropic",
    id: "puter/claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "puter",
  },
  {
    description: "โมเดลเร็วจาก Google Gemini",
    id: "puter/gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "puter",
  },
];

const legacyChatModels: ChatModel[] = [
  {
    description: "โมเดลเร็วสำหรับแชต งานเขียน และการใช้เครื่องมือ",
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "openai",
  },
];

const defaultChatModels: ChatModel[] = isPuterConfigured
  ? puterChatModels
  : legacyChatModels;

function getConfiguredModels(): ChatModel[] {
  const raw = process.env.AI_MODELS_JSON;
  if (!raw) {
    return defaultChatModels;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return defaultChatModels;
    }

    const models = parsed.filter((model): model is ChatModel =>
      Boolean(
        model &&
          typeof model === "object" &&
          typeof (model as ChatModel).id === "string" &&
          typeof (model as ChatModel).name === "string" &&
          typeof (model as ChatModel).provider === "string"
      )
    );
    return models.length > 0 ? models : defaultChatModels;
  } catch {
    console.warn("AI_MODELS_JSON is not valid JSON; using the default model.");
    return defaultChatModels;
  }
}

export const chatModels: ChatModel[] = getConfiguredModels();

/**
 * Static capability guess for Puter models. Puter routes to 500+ vendor
 * models, so instead of querying the Vercel AI Gateway we infer from the id.
 */
function getPuterCapabilities(modelId: string): ModelCapabilities {
  const name = modelId.split("/").slice(1).join("/") || modelId;
  return {
    reasoning: /^o\d/.test(name) || /reasoning/.test(name),
    tools: true,
    vision: /gpt-4o|gpt-5|gpt-6|claude|gemini/.test(name),
  };
}

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  const results = await Promise.all(
    chatModels.map(async (model) => {
      if (model.id.startsWith("puter/")) {
        return [model.id, getPuterCapabilities(model.id)];
      }

      try {
        const res = await fetch(
          `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
          { next: { revalidate: 86_400 } }
        );
        if (!res.ok) {
          return [model.id, { reasoning: false, tools: false, vision: false }];
        }

        const json = await res.json();
        const endpoints = json.data?.endpoints ?? [];
        const params = new Set(
          endpoints.flatMap(
            (e: { supported_parameters?: string[] }) =>
              e.supported_parameters ?? []
          )
        );
        const inputModalities = new Set(
          json.data?.architecture?.input_modalities ?? []
        );

        return [
          model.id,
          {
            reasoning: params.has("reasoning"),
            tools: params.has("tools"),
            vision: inputModalities.has("image"),
          },
        ];
      } catch {
        return [model.id, { reasoning: false, tools: false, vision: false }];
      }
    })
  );

  return Object.fromEntries(results);
}

export const isDemo = process.env.IS_DEMO === "1";

export const DEFAULT_CHAT_MODEL = chatModels[0]?.id ?? "openai/gpt-4o-mini";

/** Fallback title model: first configured model when AI_TITLE_MODEL is unset. */
export const DEFAULT_TITLE_MODEL = chatModels[0]?.id ?? "puter/gpt-4o-mini";

type GatewayModel = {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? [])
      .filter((m: GatewayModel) => m.type === "language")
      .map((m: GatewayModel) => ({
        capabilities: {
          reasoning: m.tags?.includes("reasoning") ?? false,
          tools: m.tags?.includes("tool-use") ?? false,
          vision: m.tags?.includes("vision") ?? false,
        },
        description: "",
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
      }));
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export type ModelAvailability = "healthy" | "impacted" | "unknown";

type GatewayEndpoint = {
  provider_name?: string;
  status?: number;
  uptime_last_15m?: number;
  uptime_last_1h?: number;
  latency_last_1h?: {
    p50?: number;
    p95?: number;
  };
};

const PROVIDER_IMPACTED_UPTIME_THRESHOLD = 99;
const PROVIDER_IMPACTED_P50_MS = 10_000;
const PROVIDER_IMPACTED_P95_MS = 30_000;

function isEndpointImpacted(endpoint: GatewayEndpoint) {
  return (
    (endpoint.status !== undefined && endpoint.status !== 0) ||
    (endpoint.uptime_last_15m !== undefined &&
      endpoint.uptime_last_15m < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.uptime_last_1h !== undefined &&
      endpoint.uptime_last_1h < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.latency_last_1h?.p50 !== undefined &&
      endpoint.latency_last_1h.p50 > PROVIDER_IMPACTED_P50_MS) ||
    (endpoint.latency_last_1h?.p95 !== undefined &&
      endpoint.latency_last_1h.p95 > PROVIDER_IMPACTED_P95_MS)
  );
}

export async function getModelAvailability(
  modelId: string
): Promise<ModelAvailability> {
  const model = chatModels.find((item) => item.id === modelId);

  if (!model) {
    return "unknown";
  }

  try {
    const res = await fetch(
      `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return "unknown";
    }

    const json = await res.json();
    const endpoints = (json.data?.endpoints ?? []) as GatewayEndpoint[];

    if (endpoints.length === 0) {
      return "unknown";
    }

    return endpoints.some(isEndpointImpacted) ? "impacted" : "healthy";
  } catch {
    return "unknown";
  }
}
