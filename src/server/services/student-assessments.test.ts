import { describe, expect, it } from "vitest";

import { saveStudentAssessment } from "./student-assessments";

describe("student assessments service", () => {
  it("throws error when status is empty", async () => {
    // We mock prisma student lookup if needed, or pass an empty status
    await expect(
      saveStudentAssessment({
        studentId: "non-existent-id",
        assessedById: "user-1",
        status: "   ",
      }),
    ).rejects.toThrow();
  });
});
