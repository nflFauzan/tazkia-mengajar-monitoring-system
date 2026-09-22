import { describe, expect, it } from "vitest";

import { submitAttendanceAppeal } from "./appeals";

describe("appeals service", () => {
  it("throws error when reason is empty", async () => {
    await expect(
      submitAttendanceAppeal({
        activityId: "act-1",
        teamMemberId: "tm-1",
        proposedAttendance: "HADIR",
        reason: "   ",
      }),
    ).rejects.toThrow("Alasan banding wajib diisi.");
  });
});
