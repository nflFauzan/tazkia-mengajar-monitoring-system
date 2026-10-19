import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { selfCheckInAction } from "./attendance-self";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activity: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    activityTeamMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    schedule: {
      findUnique: vi.fn(),
    },
  },
}));

describe("selfCheckInAction with geofencing", () => {
  const mockedRequireUser = vi.mocked(requireUser);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireUser.mockResolvedValue({
      id: "user-1",
      name: "Ustadz Ahmad",
      role: "PENGAJAR",
      teamMemberId: "tm-1",
      username: "ahmad",
      mustChangePassword: false,
    });
  });

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  it("fails when location has coordinates but user provides no GPS coordinates", async () => {
    vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
      id: "act-1",
      locationId: "loc-1",
      location: {
        id: "loc-1",
        name: "Desa Margajaya",
        latitude: -6.589,
        longitude: 106.789,
        radiusMeters: 100,
      },
      schedule: null,
    } as never);

    const result = await selfCheckInAction({
      activityId: "act-1",
      dateStr: todayStr,
      startTime: "08:00",
      attendance: "HADIR",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("mewajibkan verifikasi lokasi GPS");
    }
  });

  it("fails when user is outside the geofence radius", async () => {
    vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
      id: "act-1",
      locationId: "loc-1",
      location: {
        id: "loc-1",
        name: "Desa Margajaya",
        latitude: -6.589,
        longitude: 106.789,
        radiusMeters: 100,
      },
      schedule: null,
    } as never);

    // Far coordinates (Monas: -6.175, 106.827) ~50 km away
    const result = await selfCheckInAction({
      activityId: "act-1",
      dateStr: todayStr,
      startTime: "08:00",
      attendance: "HADIR",
      latitude: -6.175,
      longitude: 106.827,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("di luar area mengajar");
      expect(result.error).toContain("Batas toleransi");
    }
  });

  it("succeeds and records checkIn coords/distance when inside the geofence radius", async () => {
    vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
      id: "act-1",
      locationId: "loc-1",
      location: {
        id: "loc-1",
        name: "Desa Margajaya",
        latitude: -6.5891,
        longitude: 106.7891,
        radiusMeters: 100,
      },
      schedule: null,
    } as never);

    vi.spyOn(prisma.activityTeamMember, "findUnique").mockResolvedValueOnce(
      null,
    );
    vi.spyOn(prisma.activityTeamMember, "create").mockResolvedValueOnce({
      id: "atm-1",
    } as never);

    // Coordinate approx 20m away
    const result = await selfCheckInAction({
      activityId: "act-1",
      dateStr: todayStr,
      startTime: "08:00",
      attendance: "HADIR",
      latitude: -6.5892,
      longitude: 106.7891,
    });

    expect(result.ok).toBe(true);
    expect(prisma.activityTeamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attendance: "HADIR",
          checkInLatitude: -6.5892,
          checkInLongitude: 106.7891,
          checkInDistanceMeters: expect.any(Number),
        }),
      }),
    );
  });

  it("succeeds without GPS if location has no coordinates configured", async () => {
    vi.spyOn(prisma.activity, "findUnique").mockResolvedValueOnce({
      id: "act-1",
      locationId: "loc-1",
      location: {
        id: "loc-1",
        name: "Tempat Belum Ada GPS",
        latitude: null,
        longitude: null,
        radiusMeters: 100,
      },
      schedule: null,
    } as never);

    vi.spyOn(prisma.activityTeamMember, "findUnique").mockResolvedValueOnce(
      null,
    );
    vi.spyOn(prisma.activityTeamMember, "create").mockResolvedValueOnce({
      id: "atm-1",
    } as never);

    const result = await selfCheckInAction({
      activityId: "act-1",
      dateStr: todayStr,
      startTime: "08:00",
      attendance: "HADIR",
    });

    expect(result.ok).toBe(true);
  });
});
