import { COLOR_VALUES, MATERIAL_VALUES } from "@/lib/constants/filters";

export interface FaithfulnessCandidate {
  id: string;
  productId: string;
  productName?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface FaithfulnessResult {
  score: number;
  totalClaims: number;
  supportedClaims: string[];
  unsupportedClaims: string[];
  reasoning: string;
}

export interface CheckFaithfulnessInput {
  query: string;
  candidates: FaithfulnessCandidate[];
  answer: string;
}

const PRICE_RE = /\$\s?(\d{1,3}(?:,\d{3})*)(?:\.\d{2})?/g;
const DIM_RE = /\b(\d+(?:\.\d+)?)\s?(cm|m|mm|inches?|")(?=\s|$|[^a-zA-Z0-9])/gi;
const STOCK_RE =
  /\b(in stock|out of stock|low stock|available|unavailable)\b/gi;
const SHIPPING_RE = /\bships?\s+to\s+([A-Za-z]+)/gi;

function uniqueNonEmpty(values: string[]): string[] {
  // filter(Boolean) is defensive — current extractors don't emit empty strings,
  // but a future extractor that did would silently drop them otherwise.
  return [...new Set(values.filter(Boolean))];
}

export function checkFaithfulnessHeuristic(
  input: CheckFaithfulnessInput,
): FaithfulnessResult {
  const lowered = input.answer.toLowerCase();
  const haystacks = input.candidates.map((c) => c.text.toLowerCase());
  const haystack = haystacks.join(" ");
  const supported: string[] = [];
  const unsupported: string[] = [];

  // Price claims
  for (const m of input.answer.matchAll(PRICE_RE)) {
    const claim = m[0];
    const num = m[1].replace(/,/g, "");
    // Match against the haystack with comma stripped too
    const haystackDigits = haystack.replace(/,/g, "");
    if (haystackDigits.includes(num)) {
      supported.push(`price:${claim}`);
    } else {
      unsupported.push(`price:${claim}`);
    }
  }

  // Dimension claims
  for (const m of input.answer.matchAll(DIM_RE)) {
    const value = m[1];
    const unit = m[2].toLowerCase();
    const claim = `${value} ${unit}`;
    const re = new RegExp(`${value}\\s?${unit}`, "i");
    if (re.test(haystack)) {
      supported.push(`dim:${claim}`);
    } else {
      unsupported.push(`dim:${claim}`);
    }
  }

  // Material claims (token list — skip empty default if the array uses "")
  for (const material of MATERIAL_VALUES) {
    if (!material) continue;
    const m = material.toLowerCase();
    if (lowered.includes(m)) {
      if (haystack.includes(m)) supported.push(`material:${m}`);
      else unsupported.push(`material:${m}`);
    }
  }

  // Color claims
  for (const color of COLOR_VALUES) {
    if (!color) continue;
    const c = color.toLowerCase();
    if (lowered.includes(c)) {
      if (haystack.includes(c)) supported.push(`color:${c}`);
      else unsupported.push(`color:${c}`);
    }
  }

  // Product-name claims (substring of any candidate's productName)
  for (const cand of input.candidates) {
    if (!cand.productName) continue;
    const n = cand.productName.toLowerCase();
    if (lowered.includes(n)) {
      // Auto-supported because the name appears in the candidate set.
      supported.push(`name:${cand.productName}`);
    }
  }

  // Stock claims
  const isInStock = (c: FaithfulnessCandidate) => {
    const v = c.metadata?.in_stock;
    return v === true || v === 1 || v === "true";
  };
  const isOOS = (c: FaithfulnessCandidate) => {
    const v = c.metadata?.in_stock;
    return v === false || v === 0 || v === "false";
  };
  for (const m of input.answer.matchAll(STOCK_RE)) {
    const claim = m[1].toLowerCase();
    const wantsOOS = claim.includes("out") || claim.includes("unavail");
    const haveInStock = input.candidates.some(isInStock);
    const haveOOS = input.candidates.some(isOOS);
    if (wantsOOS && haveOOS) supported.push(`stock:${claim}`);
    else if (!wantsOOS && haveInStock) supported.push(`stock:${claim}`);
    else unsupported.push(`stock:${claim}`);
  }

  // Shipping claims
  for (const m of input.answer.matchAll(SHIPPING_RE)) {
    const where = m[1].toLowerCase();
    if (where.startsWith("austral")) {
      const ok = input.candidates.some((c) => c.metadata?.ships_to_au === true);
      if (ok) supported.push(`ships:${where}`);
      else unsupported.push(`ships:${where}`);
    }
    // Non-Australia shipping claims are out of scope for v1; ignore.
  }

  const supportedClaims = uniqueNonEmpty(supported);
  const unsupportedClaims = uniqueNonEmpty(unsupported);
  const totalClaims = supportedClaims.length + unsupportedClaims.length;
  const score = totalClaims === 0 ? 1 : supportedClaims.length / totalClaims;

  const reasoning =
    totalClaims === 0
      ? "No factual claims detected (e.g., refusal or pure-style answer)."
      : `${supportedClaims.length} of ${totalClaims} claims matched candidate chunks` +
        (unsupportedClaims.length
          ? `; unsupported: ${unsupportedClaims.join(", ")}`
          : "") +
        ".";

  return {
    score,
    totalClaims,
    supportedClaims,
    unsupportedClaims,
    reasoning,
  };
}

/**
 * LLM-as-judge implementation. Stubbed in v1 — see Phase 1.6 spec §4.5
 * for the upgrade path. The flag exists so a CI smoke test can fail
 * fast and visibly if anyone tries to enable the upgrade prematurely.
 */
export async function checkFaithfulnessLLM(
  _input: CheckFaithfulnessInput,
): Promise<FaithfulnessResult> {
  throw new Error("LLM judge not implemented; see Phase 1.6 spec §4.5");
}

/**
 * Public dispatcher: routes to heuristic or LLM based on
 * `FAITHFULNESS_BACKEND` (default = heuristic; "llm" = stub). The async
 * signature is preserved so call sites (eval harness) stay identical
 * across the upgrade.
 */
export async function checkFaithfulness(
  input: CheckFaithfulnessInput,
): Promise<FaithfulnessResult> {
  if (process.env.FAITHFULNESS_BACKEND === "llm") {
    return checkFaithfulnessLLM(input);
  }
  return checkFaithfulnessHeuristic(input);
}
