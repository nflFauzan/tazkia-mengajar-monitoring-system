import { describe, expect, it } from "vitest";

import {
  buildLoginCredentialsMessage,
  buildPasswordResetMessage,
  buildWhatsAppLink,
  sanitizeIndonesianPhone,
} from "./whatsapp";

describe("sanitizeIndonesianPhone", () => {
  it("converts numbers starting with 0 to 62", () => {
    expect(sanitizeIndonesianPhone("081234567890")).toBe("6281234567890");
    expect(sanitizeIndonesianPhone("0812-3456-7890")).toBe("6281234567890");
    expect(sanitizeIndonesianPhone("0857 1234 5678")).toBe("6285712345678");
  });

  it("converts numbers starting with 8 to 628", () => {
    expect(sanitizeIndonesianPhone("81234567890")).toBe("6281234567890");
  });

  it("handles numbers already starting with 62 or +62", () => {
    expect(sanitizeIndonesianPhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(sanitizeIndonesianPhone("6281234567890")).toBe("6281234567890");
  });

  it("returns empty string for null, undefined, or empty values", () => {
    expect(sanitizeIndonesianPhone(null)).toBe("");
    expect(sanitizeIndonesianPhone(undefined)).toBe("");
    expect(sanitizeIndonesianPhone("")).toBe("");
    expect(sanitizeIndonesianPhone("   ")).toBe("");
    expect(sanitizeIndonesianPhone("abc-def")).toBe("");
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me URL with sanitized phone and encoded text", () => {
    const link = buildWhatsAppLink("081234567890", "Halo dunia!");
    expect(link).toBe("https://wa.me/6281234567890?text=Halo%20dunia!");
  });

  it("falls back to generic wa.me URL without phone if phone is empty", () => {
    const link = buildWhatsAppLink("", "Halo dunia!");
    expect(link).toBe("https://wa.me/?text=Halo%20dunia!");
  });
});

describe("buildLoginCredentialsMessage", () => {
  it("formats credential message with nickname when present", () => {
    const msg = buildLoginCredentialsMessage({
      fullName: "Muhammad Fauzan",
      nickname: "Ozan",
      username: "ozan@tazkiamengajar.id",
      temporaryPassword: "TemP-Pass-1234",
      loginUrl: "https://example.com/login",
    });

    expect(msg).toContain("Kak Ozan");
    expect(msg).toContain("ozan@tazkiamengajar.id");
    expect(msg).toContain("TemP-Pass-1234");
    expect(msg).toContain("https://example.com/login");
    expect(msg).toContain("Catatan Penting");
  });

  it("formats credential message with fullName when nickname is absent", () => {
    const msg = buildLoginCredentialsMessage({
      fullName: "Siti Rahma",
      username: "siti.rahma@tazkiamengajar.id",
      temporaryPassword: "TemP-Pass-5678",
      loginUrl: "https://example.com/login",
    });

    expect(msg).toContain("Kak Siti Rahma");
    expect(msg).toContain("siti.rahma@tazkiamengajar.id");
  });
});

describe("buildPasswordResetMessage", () => {
  it("formats password reset message properly", () => {
    const msg = buildPasswordResetMessage({
      fullName: "Ahmad Fauzi",
      nickname: "Ahmad",
      username: "ahmad@tazkiamengajar.id",
      temporaryPassword: "NewTempPass99",
      loginUrl: "https://example.com/login",
    });

    expect(msg).toContain("Kak Ahmad");
    expect(msg).toContain("ahmad@tazkiamengajar.id");
    expect(msg).toContain("NewTempPass99");
    expect(msg).toContain("direset oleh Admin");
  });
});
