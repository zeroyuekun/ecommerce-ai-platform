import { describe, expect, it } from "vitest";
import { redactPII } from "@/lib/monitoring";

describe("redactPII", () => {
  it("redacts emails", () => {
    expect(redactPII("contact me at user@example.com please")).toBe(
      "contact me at [EMAIL] please",
    );
    expect(redactPII("hi USER.NAME+tag@sub.example.co.uk!")).toBe(
      "hi [EMAIL]!",
    );
  });

  it("redacts phone numbers", () => {
    expect(redactPII("call +1 (555) 123-4567 today")).toBe(
      "call [PHONE] today",
    );
    expect(redactPII("AU mobile: 0412 345 678")).toBe("AU mobile: [PHONE]");
  });

  it("leaves text without PII unchanged", () => {
    expect(redactPII("oak coffee table under $400")).toBe(
      "oak coffee table under $400",
    );
  });

  it("does not mistake a price for a phone", () => {
    expect(redactPII("the price is $399.00")).toBe("the price is $399.00");
  });
});
