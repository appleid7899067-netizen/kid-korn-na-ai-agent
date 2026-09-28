/**
 * Server-side helpers for Puter (https://puter.com).
 *
 * Puter provides authentication ("Sign in with Puter") and a large catalog of
 * AI models behind a single OpenAI-compatible endpoint. See
 * https://docs.puter.com for the full reference.
 */

export const PUTER_API_ORIGIN =
  process.env.PUTER_API_ORIGIN ?? "https://api.puter.com";

/** OpenAI-compatible chat completions endpoint (works with @ai-sdk/openai). */
export const PUTER_OPENAI_BASE_URL = `${PUTER_API_ORIGIN}/puterai/openai/v1/`;

export type PuterIdentity = {
  email?: string | null;
  image?: string | null;
  username: string;
  uuid: string;
};

/**
 * Verify a Puter auth token by asking Puter who the token belongs to.
 * Returns the identity on success, or null when the token is invalid.
 */
export async function verifyPuterToken(
  token: string
): Promise<PuterIdentity | null> {
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${PUTER_API_ORIGIN}/whoami`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      email?: string;
      profilePicture?: string;
      username?: string;
      uuid?: string;
    };

    if (!data?.username) {
      return null;
    }

    return {
      email: data.email ?? null,
      image: data.profilePicture ?? null,
      username: data.username,
      uuid: data.uuid ?? "",
    };
  } catch {
    return null;
  }
}

/** Deterministic local account email for a Puter username (fits varchar(64)). */
export function puterEmailFor(username: string) {
  const safe = username.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `puter-${safe.slice(0, 48) || "user"}@puter.app`;
}
