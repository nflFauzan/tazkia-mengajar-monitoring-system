import { describe, expect, it } from "vitest";

import { checkBeneficiaryConsistency, tallyAttendance } from "./attendance";

describe("tallyAttendance", () => {
  it("counts each status separately", () => {
    const tally = tallyAttendance([
      { attendance: "HADIR" },
      { attendance: "HADIR" },
      { attendance: "IZIN" },
      { attendance: "SAKIT" },
      { attendance: "ALPA" },
    ]);

    expect(tally).toEqual({ total: 5, hadir: 2, izin: 1, sakit: 1, alpa: 1 });
  });

  it("returns zeroes for an empty list", () => {
    expect(tallyAttendance([])).toEqual({
      total: 0,
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
    });
  });
});

describe("checkBeneficiaryConsistency", () => {
  it("stays silent when no individual students are recorded", () => {
    // PRD section 12: individual students are optional, so a plain count is a
    // complete and valid record, not an inconsistency.
    expect(checkBeneficiaryConsistency(10, [])).toBeNull();
  });

  it("stays silent when the count matches those present", () => {
    const students = [
      { attendance: "HADIR" as const },
      { attendance: "HADIR" as const },
      { attendance: "IZIN" as const },
    ];
    expect(checkBeneficiaryConsistency(2, students)).toBeNull();
  });

  it("warns when more students attended than the count claims", () => {
    const students = [
      { attendance: "HADIR" as const },
      { attendance: "HADIR" as const },
      { attendance: "HADIR" as const },
    ];
    const warning = checkBeneficiaryConsistency(2, students);
    expect(warning).toContain("lebih kecil");
    expect(warning).toContain("3");
  });

  it("explains the surplus when the count exceeds those present", () => {
    const students = [
      { attendance: "HADIR" as const },
      { attendance: "IZIN" as const },
    ];
    const warning = checkBeneficiaryConsistency(5, students);
    expect(warning).toContain("lebih besar");
    // 5 recorded minus 1 present leaves 4 unaccounted for.
    expect(warning).toContain("4 orang");
  });

  it("compares against those present, not everyone listed", () => {
    // The PRD example: 10 listed, 8 hadir, 1 izin, 1 sakit is consistent with a
    // beneficiary count of 8, because absentees received nothing.
    const students = [
      ...Array.from({ length: 8 }, () => ({ attendance: "HADIR" as const })),
      { attendance: "IZIN" as const },
      { attendance: "SAKIT" as const },
    ];
    expect(checkBeneficiaryConsistency(8, students)).toBeNull();
  });
});
