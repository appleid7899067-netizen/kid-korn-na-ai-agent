"use client";

/**
 * Browser helpers for Puter.js (https://docs.puter.com).
 *
 * The SDK is loaded from https://js.puter.com/v2/ on demand so the app works
 * even when the script is blocked: sign-in then fails with a clear error.
 */

export type PuterSignInResult = {
  error?: string;
  msg?: string;
  success?: boolean;
  token?: string;
  username?: string;
};

type PuterAuthModule = {
  getUser: () => Promise<Record<string, unknown>>;
  isSignedIn: () => boolean;
  signIn: (options?: {
    attempt_temp_user_creation?: boolean;
    request_auth?: boolean;
  }) => Promise<PuterSignInResult>;
  signOut: () => void;
};

type PuterGlobal = {
  auth: PuterAuthModule;
};

const SCRIPT_ID = "puter-js-sdk";
const SCRIPT_SRC = "https://js.puter.com/v2/";
const LOAD_TIMEOUT_MS = 20_000;

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

function ensureScriptTag() {
  if (document.getElementById(SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  document.head.appendChild(script);
}

/** Load the Puter SDK and resolve with `window.puter`. */
export async function loadPuter(): Promise<PuterGlobal> {
  if (typeof window === "undefined") {
    throw new Error("Puter is only available in the browser");
  }

  ensureScriptTag();

  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  while (!window.puter) {
    if (Date.now() > deadline) {
      throw new Error(
        "Could not load the Puter SDK. Check your connection or ad-blocker, then try again."
      );
    }
    // biome-ignore lint/performance/noAwaitInLoops: intentional poll for the SDK global
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return window.puter;
}

/**
 * Open the Puter sign-in popup and resolve with a verified token + username.
 * Must be called from a user gesture (button click).
 */
export async function signInWithPuter(): Promise<{
  token: string;
  username: string;
}> {
  const puter = await loadPuter();
  const result = await puter.auth.signIn({ request_auth: true });

  if (!result || result.error || !result.success || !result.token) {
    throw new Error(
      result?.msg || result?.error || "Puter sign-in was cancelled"
    );
  }

  return {
    token: result.token,
    username: result.username ?? "",
  };
}
