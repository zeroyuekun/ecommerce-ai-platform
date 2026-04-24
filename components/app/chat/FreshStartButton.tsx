/**
 * Fresh-start affordance per spec §8.4. Renders nothing until the
 * conversation crosses a threshold; then surfaces a small button in the
 * chat header. Manual reset only in Phase 1 — auto-suggest by cosine
 * distance ships behind RAG_AUTO_FRESH_START in a follow-up.
 */
"use client";
import { Button } from "@/components/ui/button";

const FRESH_START_TURN_THRESHOLD = 10;

interface FreshStartButtonProps {
  turnCount: number;
  onReset: () => void;
}

export function FreshStartButton({
  turnCount,
  onReset,
}: FreshStartButtonProps) {
  if (turnCount < FRESH_START_TURN_THRESHOLD) return null;
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onReset}
      title="Start a fresh conversation. Cart and recently-viewed are kept."
    >
      Fresh start
    </Button>
  );
}
