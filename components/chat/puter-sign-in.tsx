"use client";

import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useState } from "react";

import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signInWithPuter } from "@/lib/puter/client";

/**
 * "Continue with Puter" — opens the Puter sign-in popup, verifies the returned
 * token server-side, and starts a session for the Puter account. Chat calls
 * then run on the user's own Puter token (User-Pays model).
 */
export function PuterSignInButton() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [isPending, setIsPending] = useState(false);

  const handleClick = useCallback(async () => {
    if (isPending) {
      return;
    }
    setIsPending(true);

    try {
      const { token, username } = await signInWithPuter();

      const result = await signIn("puter", {
        redirect: false,
        token,
        username,
      });

      if (result?.error) {
        throw new Error("Puter sign-in failed. Please try again.");
      }

      await updateSession();
      router.push("/");
      router.refresh();
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : "Puter sign-in failed",
        type: "error",
      });
      setIsPending(false);
    }
  }, [isPending, router, updateSession]);

  return (
    <Button
      className="h-10 gap-2 rounded-lg border border-border/50 bg-muted/50 text-sm transition-colors hover:bg-muted"
      disabled={isPending}
      onClick={handleClick}
      type="button"
      variant="outline"
    >
      {isPending ? <Spinner /> : <PuterMark />}
      {isPending ? "Opening Puter..." : "Continue with Puter"}
    </Button>
  );
}

function PuterMark() {
  return (
    <svg
      aria-label="Puter"
      className="size-4"
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Puter</title>
      <path
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 4.5a3 3 0 0 1 0 6 3 3 0 0 1 0-6Zm0 13a7.5 7.5 0 0 1-5.6-2.5c.9-1.8 3-3 5.6-3s4.7 1.2 5.6 3A7.5 7.5 0 0 1 12 19.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
