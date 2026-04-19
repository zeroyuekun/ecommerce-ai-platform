import { describe, expect, it } from "vitest";
import { extractBalancedJson, safeParseJson } from "@/lib/ai/json-extract";

describe("extractBalancedJson", () => {
  it("returns null for input without braces", () => {
    expect(extractBalancedJson("no json here")).toBe(null);
  });

  it("extracts a simple top-level object", () => {
    expect(extractBalancedJson('{"a":1}')).toBe('{"a":1}');
  });

  it("extracts JSON wrapped in prose", () => {
    const text = 'Sure, here it is: {"a":1,"b":2}. Let me know!';
    expect(extractBalancedJson(text)).toBe('{"a":1,"b":2}');
  });

  it("handles nested objects", () => {
    const text = '{"outer":{"inner":{"deep":42}}}';
    expect(extractBalancedJson(text)).toBe(text);
  });

  it("ignores braces inside strings", () => {
    const text = '{"label":"hello {world}"}';
    expect(extractBalancedJson(text)).toBe('{"label":"hello {world}"}');
  });

  it("handles escaped quotes inside strings", () => {
    const text = '{"msg":"she said \\"hi\\""}';
    expect(extractBalancedJson(text)).toBe('{"msg":"she said \\"hi\\""}');
  });

  it("returns the first balanced object when multiple are present", () => {
    const text = '{"first":1} and {"second":2}';
    expect(extractBalancedJson(text)).toBe('{"first":1}');
  });

  it("returns null for unbalanced braces", () => {
    expect(extractBalancedJson('{"a":1')).toBe(null);
  });
});

describe("safeParseJson", () => {
  it("parses clean JSON directly", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("trims and parses", () => {
    expect(safeParseJson<{ x: number }>('  {"x":1}  ')).toEqual({ x: 1 });
  });

  it("falls back to balanced-brace extraction when wrapped in prose", () => {
    const text = 'Here: {"x":1}. Cheers.';
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 1 });
  });

  it("throws when no JSON object exists", () => {
    expect(() => safeParseJson("just prose")).toThrow(/No JSON object/);
  });

  it("throws when the extracted candidate is invalid JSON", () => {
    // Balanced braces but invalid content inside.
    expect(() => safeParseJson("prose {not-json}")).toThrow();
  });
});
