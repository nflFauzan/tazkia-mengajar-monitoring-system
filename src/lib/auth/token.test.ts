import { describe, expect, it } from "vitest";

import { createSessionToken, verifySessionToken } from "./token";
import type { SessionUser } from "./token";

describe("session token logic", () => {
  it("signs and verifies an ADMIN token", async () => {
    process.env.AUTH_SECRET = "12345678901234567890123456789012";

    const adminUser: SessionUser = {
      id: "admin-1",
      username: "admin",
      name: "Administrator",
      role: "ADMIN",
      mustChangePassword: false,
    };

    const token = await createSessionToken(adminUser);
    const verified = await verifySessionToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(adminUser.id);
    expect(verified?.username).toBe(adminUser.username);
    expect(verified?.role).toBe("ADMIN");
    expect(verified?.mustChangePassword).toBe(false);
  });

  it("signs and verifies a PENGAJAR token with mustChangePassword flag", async () => {
    process.env.AUTH_SECRET = "12345678901234567890123456789012";

    const pengajarUser: SessionUser = {
      id: "pengajar-1",
      username: "ustadzah_fatimah",
      name: "Fatimah Az-Zahra",
      role: "PENGAJAR",
      mustChangePassword: true,
      teamMemberId: "team-member-123",
    };

    const token = await createSessionToken(pengajarUser);
    const verified = await verifySessionToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(pengajarUser.id);
    expect(verified?.username).toBe(pengajarUser.username);
    expect(verified?.role).toBe("PENGAJAR");
    expect(verified?.mustChangePassword).toBe(true);
    expect(verified?.teamMemberId).toBe("team-member-123");
  });

  it("rejects an invalid token", async () => {
    process.env.AUTH_SECRET = "12345678901234567890123456789012";
    const verified = await verifySessionToken("invalid-token");
    expect(verified).toBeNull();
  });
});
