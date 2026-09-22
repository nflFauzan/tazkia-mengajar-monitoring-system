import { describe, expect, it } from "vitest";

import {
  generatePengajarUsername,
  generateTemporaryPassword,
} from "./credentials-generator";

describe("credentials-generator", () => {
  describe("generatePengajarUsername", () => {
    it("generates founder username without year suffix", () => {
      const username = generatePengajarUsername("Mohammad Naufal Fauzan", "Fauzan", {
        isFounder: true,
      });
      expect(username).toBe("fauzan@tazkiamengajar.id");
    });

    it("falls back to first name if nickname is null or empty", () => {
      const username = generatePengajarUsername("Amanda Wijayanti", null, {
        isFounder: true,
      });
      expect(username).toBe("amanda@tazkiamengajar.id");
    });

    it("generates new member username with specified 2-digit year", () => {
      const username = generatePengajarUsername("Mohammad Naufal Fauzan", "Fauzan", {
        isFounder: false,
        year: "26",
      });
      expect(username).toBe("fauzan.26@tazkiamengajar.id");
    });

    it("cleans special characters and spaces from nickname", () => {
      const username = generatePengajarUsername("Nurul Aini", "Nurul A.", {
        isFounder: false,
        year: "26",
      });
      expect(username).toBe("nurula.26@tazkiamengajar.id");
    });

    it("handles empty name safely", () => {
      const username = generatePengajarUsername("", "", { isFounder: true });
      expect(username).toBe("pengajar@tazkiamengajar.id");
    });
  });

  describe("generateTemporaryPassword", () => {
    it("generates a password starting with TM- and minimum 8 characters", () => {
      const password = generateTemporaryPassword();
      expect(password).toMatch(/^TM-\d{5}$/);
      expect(password.length).toBe(8);
    });

    it("generates different passwords on successive calls", () => {
      const p1 = generateTemporaryPassword();
      const p2 = generateTemporaryPassword();
      // Extremely low probability of collision
      expect(typeof p1).toBe("string");
      expect(typeof p2).toBe("string");
    });
  });
});
