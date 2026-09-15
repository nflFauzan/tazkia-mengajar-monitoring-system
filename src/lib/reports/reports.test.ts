import { describe, expect, it } from "vitest";

import {
  buildDefaultNarrative,
  deriveRegion,
  formatTeamList,
  generateActivityReport,
  renderReportTemplate,
  validateReportData,
} from "./index";
import type { ReportActivityInput } from "./types";

/**
 * The report is the product's actual output — it gets pasted into WhatsApp and
 * sent to partners. These tests pin the exact template text, because a stray
 * space or a lost line break is invisible in review but obvious to a recipient.
 */

const baseActivity: ReportActivityInput = {
  // 12 September 2026 is a Saturday.
  date: new Date(Date.UTC(2026, 8, 12)),
  startTime: "13:00",
  endTime: "14:30",
  partner: "Publik",
  beneficiary: "Anak-anak Desa Binaan Margajaya",
  beneficiaryCount: 10,
  aidType: "Kegiatan belajar mengajar",
  location: {
    name: "Desa Binaan Margajaya",
    address:
      "Jalan Pemuda, Kel. Margajaya, Kec. Bogor Barat, Kota Bogor, Jawa Barat.",
  },
  teamMembers: [
    { fullName: "Shifi Amalia Zein", attendance: "HADIR" },
    { fullName: "Muhamad Naufal Fauzan", attendance: "IZIN" },
    { fullName: "Thoriqurrahman Akrami", attendance: "SAKIT" },
    { fullName: "Rahmawati", attendance: "ALPA" },
  ],
  documentationCount: 2,
};

describe("formatTeamList", () => {
  it("prints a bare name for HADIR and annotates every other status", () => {
    expect(formatTeamList(baseActivity.teamMembers)).toBe(
      [
        "- Shifi Amalia Zein",
        "- Muhamad Naufal Fauzan (izin)",
        "- Thoriqurrahman Akrami (sakit)",
        "- Rahmawati (alpa)",
      ].join("\n"),
    );
  });

  it("returns an empty string rather than throwing on an empty team", () => {
    expect(formatTeamList([])).toBe("");
  });
});

describe("renderReportTemplate", () => {
  const text = renderReportTemplate(baseActivity, "NARASI");

  it("formats the day and date in Indonesian", () => {
    expect(text).toContain("Sabtu, 12 September 2026");
  });

  it("keeps the WhatsApp bold markers and the WIB time range", () => {
    expect(text).toContain("*Assalamualaikum warahmatullahi wabarakatuh*");
    expect(text).toContain("Pukul 13:00 s/d 14:30 WIB");
    expect(text).toContain("*Tazkia Mengajar x BaitulMal Tazkia*");
  });

  it("uses the full address, not the location name", () => {
    expect(text).toContain("Jalan Pemuda, Kel. Margajaya");
  });

  it("renders the count and aid type as list items", () => {
    expect(text).toContain("- 10 anak");
    expect(text).toContain("- Kegiatan belajar mengajar");
  });

  it("preserves the blank line before the team block", () => {
    expect(text).toContain("⛑️ *Tim yang bertugas*\n\n- Shifi Amalia Zein");
  });

  it("places the narrative under the Narasi heading", () => {
    expect(text).toContain("📄 *Narasi :*\nNARASI");
  });

  it("does not leave any unreplaced placeholder", () => {
    expect(text).not.toMatch(/\{[A-Z_]+\}/);
  });
});

describe("deriveRegion", () => {
  it("prefers the most specific administrative segment", () => {
    expect(deriveRegion(baseActivity.location.address)).toBe("Margajaya");
  });

  it("falls back to null when the address has no recognisable segment", () => {
    expect(deriveRegion("Jalan tanpa keterangan wilayah")).toBeNull();
  });
});

describe("buildDefaultNarrative", () => {
  it("mentions the day, date and location", () => {
    const narrative = buildDefaultNarrative(baseActivity);
    expect(narrative).toContain("Sabtu");
    expect(narrative).toContain("12 September 2026");
    expect(narrative).toContain("Desa Binaan Margajaya");
  });

  it("lowercases the aid type into the purpose clause", () => {
    expect(buildDefaultNarrative(baseActivity)).toContain(
      "untuk kegiatan belajar mengajar",
    );
  });
});

describe("validateReportData", () => {
  it("accepts a complete activity", () => {
    const result = validateReportData(baseActivity, "Narasi lengkap.");
    expect(result.isComplete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("requires at least one documentation file", () => {
    const result = validateReportData(
      { ...baseActivity, documentationCount: 0 },
      "Narasi.",
    );
    expect(result.isComplete).toBe(false);
    expect(result.missing).toContain("Dokumentasi");
  });

  it("requires at least one team member", () => {
    const result = validateReportData(
      { ...baseActivity, teamMembers: [] },
      "Narasi.",
    );
    expect(result.missing).toContain("Tim yang bertugas");
  });

  it("rejects a zero beneficiary count", () => {
    const result = validateReportData(
      { ...baseActivity, beneficiaryCount: 0 },
      "Narasi.",
    );
    expect(result.missing).toContain("Jumlah penerima manfaat");
  });

  it("treats a whitespace-only narrative as missing", () => {
    const result = validateReportData(baseActivity, "   ");
    expect(result.missing).toContain("Narasi");
  });

  it("always returns the full checklist so the UI can show ticks too", () => {
    const result = validateReportData(baseActivity, "Narasi.");
    expect(result.checklist).toHaveLength(10);
  });
});

describe("generateActivityReport narrative ownership", () => {
  it("generates a narrative when none is stored", () => {
    const result = generateActivityReport(baseActivity);
    expect(result.narrative).toContain("Alhamdulillah");
  });

  it("keeps an admin-edited narrative when the report is rebuilt", () => {
    const result = generateActivityReport(baseActivity, {
      existingNarrative: "Narasi tulisan admin.",
    });
    expect(result.narrative).toBe("Narasi tulisan admin.");
    expect(result.text).toContain("Narasi tulisan admin.");
  });

  it("replaces the narrative only when regeneration is explicit", () => {
    const result = generateActivityReport(baseActivity, {
      existingNarrative: "Narasi tulisan admin.",
      regenerateNarrative: true,
    });
    expect(result.narrative).not.toBe("Narasi tulisan admin.");
    expect(result.narrative).toContain("Alhamdulillah");
  });

  it("ignores a blank stored narrative and generates a fresh one", () => {
    const result = generateActivityReport(baseActivity, {
      existingNarrative: "   ",
    });
    expect(result.narrative).toContain("Alhamdulillah");
  });
});
