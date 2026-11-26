/**
 * Indonesian National Holidays (Tanggal Merah) and Commemorative Days (Hari Peringatan).
 * Specially curated for Tazkia Mengajar education, social, religious, and Instagram content planning.
 */

export type EventCategory =
  | "NATIONAL"
  | "RELIGIOUS"
  | "EDUCATION"
  | "AWARENESS";

export interface IndonesianCalendarEvent {
  dateKey: string; // "YYYY-MM-DD"
  name: string;
  isHoliday: boolean; // true = tanggal merah libur resmi
  category: EventCategory;
  suggestedContent?: string; // Rekomendasi tema/ide poster atau konten Instagram
}

interface AnnualEvent {
  monthDay: string; // "MM-DD"
  name: string;
  isHoliday: boolean;
  category: EventCategory;
  suggestedContent?: string;
}

/**
 * Fixed annual national commemorative days and fixed holidays (Masehi).
 * Recurring every year on the same MM-DD date.
 */
export const ANNUAL_INDONESIAN_EVENTS: AnnualEvent[] = [
  // Januari
  {
    monthDay: "01-01",
    name: "Tahun Baru Masehi",
    isHoliday: true,
    category: "NATIONAL",
    suggestedContent: "Poster resolusi tahun baru & semangat belajar adik-adik binaan.",
  },
  {
    monthDay: "01-10",
    name: "Hari Gerakan Satu Juta Pohon",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Edukasi cinta lingkungan & penanaman pohon bersama adik-adik.",
  },
  {
    monthDay: "01-25",
    name: "Hari Gizi Nasional",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Infografis gizi seimbang untuk tumbuh kembang adik-adik binaan.",
  },

  // Februari
  {
    monthDay: "02-15",
    name: "Hari Kanker Anak Sedunia",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Poster kepedulian, empati, dan doa untuk kesembuhan anak-anak pejuang.",
  },
  {
    monthDay: "02-21",
    name: "Hari Peduli Sampah Nasional",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Aksi bersih lingkungan & kebiasaan membuang sampah pada tempatnya.",
  },

  // Maret
  {
    monthDay: "03-08",
    name: "Hari Perempuan Internasional",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Apresiasi relawan perempuan & ibu tangguh dalam pendidikan anak.",
  },
  {
    monthDay: "03-09",
    name: "Hari Musik Nasional",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Ceria bernyanyi lagu kebangsaan & lagu anak mendidik saat belajar.",
  },
  {
    monthDay: "03-20",
    name: "Hari Dongeng Sedunia",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Dokumentasi mendongeng dan cerita inspiratif untuk adik-adik binaan.",
  },
  {
    monthDay: "03-22",
    name: "Hari Air Sedunia",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Edukasi pentingnya air bersih dan pola hidup sehat bagi anak.",
  },

  // April
  {
    monthDay: "04-02",
    name: "Hari Buku Anak Sedunia",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Ajakan membaca buku cerita & galang donasi buku anak.",
  },
  {
    monthDay: "04-21",
    name: "Hari Kartini",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Poster kutipan semangat Kartini: Habis Gelap Terbitlah Terang dalam pendidikan.",
  },
  {
    monthDay: "04-22",
    name: "Hari Bumi",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Poster menjaga kelestarian alam dan lingkungan tempat tinggal.",
  },
  {
    monthDay: "04-28",
    name: "Hari Puisi Nasional",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Karya puisi sederhana dan celoteh manis adik binaan.",
  },

  // Mei
  {
    monthDay: "05-01",
    name: "Hari Buruh Internasional",
    isHoliday: true,
    category: "NATIONAL",
    suggestedContent: "Apresiasi kerja keras para orang tua pekerja dan buruh tangguh.",
  },
  {
    monthDay: "05-02",
    name: "Hari Pendidikan Nasional (Hardiknas)",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Poster Hari Pendidikan Nasional: Hak belajar bagi setiap anak Indonesia.",
  },
  {
    monthDay: "05-17",
    name: "Hari Buku Nasional",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Kampanye literasi: Membuka jendela dunia melalui membaca buku.",
  },
  {
    monthDay: "05-20",
    name: "Hari Kebangkitan Nasional",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Semangat kebangkitan pemuda dan relawan mengajar untuk masa depan.",
  },

  // Juni
  {
    monthDay: "06-01",
    name: "Hari Lahir Pancasila",
    isHoliday: true,
    category: "NATIONAL",
    suggestedContent: "Poster nilai-nilai luhur Pancasila dalam keberagaman dan gotong royong.",
  },
  {
    monthDay: "06-05",
    name: "Hari Lingkungan Hidup Sedunia",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Aksi jaga kebersihan kelas dan lingkungan belajar adik-adik.",
  },

  // Juli
  {
    monthDay: "07-23",
    name: "Hari Anak Nasional (HAN)",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Poster Hari Anak Nasional: Anak Terlindungi, Indonesia Maju.",
  },

  // Agustus
  {
    monthDay: "08-10",
    name: "Hari Konservasi Alam Nasional",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Mengenalkan flora dan fauna Indonesia kepada adik binaan.",
  },
  {
    monthDay: "08-14",
    name: "Hari Pramuka",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Semangat kepramukaan: mandiri, tangguh, dan suka menolong.",
  },
  {
    monthDay: "08-17",
    name: "Hari Kemerdekaan RI (HUT RI)",
    isHoliday: true,
    category: "NATIONAL",
    suggestedContent: "Poster Dirgahayu RI: Mengisi kemerdekaan dengan mencerdaskan bangsa.",
  },

  // September
  {
    monthDay: "09-08",
    name: "Hari Literasi / Aksara Internasional",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Pentingnya literasi baca, tulis, dan numerasi sejak usia dini.",
  },
  {
    monthDay: "09-17",
    name: "Hari Palang Merah Indonesia (PMI)",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Edukasi P3K sederhana & kepedulian terhadap sesama.",
  },

  // Oktober
  {
    monthDay: "10-01",
    name: "Hari Kesaktian Pancasila",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Menjaga persatuan dan keutuhan bangsa melalui pendidikan karakter.",
  },
  {
    monthDay: "10-02",
    name: "Hari Batik Nasional",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Foto/poster mengenalkan ragam motif batik warisan budaya Indonesia.",
  },
  {
    monthDay: "10-05",
    name: "Hari Guru Sedunia",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Apresiasi dedikasi para guru dan relawan pendidikan di seluruh pelosok.",
  },
  {
    monthDay: "10-22",
    name: "Hari Santri Nasional",
    isHoliday: false,
    category: "RELIGIOUS",
    suggestedContent: "Semangat santri menimba ilmu agama dan adab untuk kemaslahatan umat.",
  },
  {
    monthDay: "10-28",
    name: "Hari Sumpah Pemuda",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Poster Sumpah Pemuda: Peran pemuda bergerak nyata lewat mengajar.",
  },

  // November
  {
    monthDay: "11-10",
    name: "Hari Pahlawan",
    isHoliday: false,
    category: "NATIONAL",
    suggestedContent: "Poster Hari Pahlawan: Meneladani keberanian dan pengorbanan para pejuang.",
  },
  {
    monthDay: "11-12",
    name: "Hari Ayah Nasional",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Apresiasi cinta dan pengorbanan sosok ayah pencari nafkah keluarga.",
  },
  {
    monthDay: "11-20",
    name: "Hari Anak Sedunia",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Menjamin hak setiap anak untuk belajar, bermain, dan bahagia.",
  },
  {
    monthDay: "11-25",
    name: "Hari Guru Nasional",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Poster terima kasih pahlawan tanpa tanda jasa & relawan pengajar.",
  },
  {
    monthDay: "11-28",
    name: "Hari Menanam Pohon Indonesia",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Aksi hijau menanam bibit tanaman bersama adik-adik binaan.",
  },

  // Desember
  {
    monthDay: "12-03",
    name: "Hari Disabilitas Internasional",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Edukasi inklusivitas: Setiap anak istimewa dan berharga.",
  },
  {
    monthDay: "12-05",
    name: "Hari Relawan Internasional",
    isHoliday: false,
    category: "EDUCATION",
    suggestedContent: "Apresiasi penuh cinta untuk seluruh relawan Tazkia Mengajar.",
  },
  {
    monthDay: "12-22",
    name: "Hari Ibu",
    isHoliday: false,
    category: "AWARENESS",
    suggestedContent: "Poster Hari Ibu: Madrasah pertama bagi setiap anak adalah sang ibu.",
  },
  {
    monthDay: "12-25",
    name: "Hari Raya Natal",
    isHoliday: true,
    category: "RELIGIOUS",
    suggestedContent: "Ucapan toleransi dan damai bagi yang merayakan.",
  },
];

/**
 * Variable Lunar / Hijri / Christian movable holidays in Indonesia by year
 * based on SKB 3 Menteri and astronomical calculations (2025, 2026, 2027).
 */
export const YEAR_SPECIFIC_HOLIDAYS: Record<number, Array<{
  dateKey: string;
  name: string;
  isHoliday: boolean;
  category: EventCategory;
  suggestedContent?: string;
}>> = {
  2025: [
    { dateKey: "2025-01-27", name: "Isra Mi'raj Nabi Muhammad SAW", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Hikmah perjalanan Isra Mi'raj & perintah shalat bagi adik-adik binaan." },
    { dateKey: "2025-01-29", name: "Tahun Baru Imlek 2576 Kongzili", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Ucapan selamat Tahun Baru Imlek & pesan kerukunan." },
    { dateKey: "2025-03-29", name: "Hari Suci Nyepi (Tahun Baru Saka 1947)", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Menghormati kesunyian & refleksi diri dalam kerukunan beragama." },
    { dateKey: "2025-03-31", name: "Hari Raya Idul Fitri 1446 H", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Poster Selamat Hari Raya Idul Fitri: Taqabbalallahu Minna Wa Minkum." },
    { dateKey: "2025-04-01", name: "Hari Raya Idul Fitri 1446 H (Hari Ke-2)", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Kebahagiaan silaturahmi bersama keluarga & adik binaan." },
    { dateKey: "2025-04-18", name: "Wafat Yesus Kristus", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2025-04-20", name: "Hari Paskah", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2025-05-12", name: "Hari Raya Waisak 2569 BE", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2025-05-29", name: "Kenaikan Yesus Kristus", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2025-06-07", name: "Hari Raya Idul Adha 1446 H", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Poster Idul Adha: Makna pengorbanan, keikhlasan, dan kepedulian berbagi." },
    { dateKey: "2025-06-27", name: "Tahun Baru Islam 1447 H (1 Muharram)", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Menyambut Tahun Baru Hijriah dengan semangat hijrah menuju kebaikan." },
    { dateKey: "2025-09-05", name: "Maulid Nabi Muhammad SAW", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Meneladani akhlak mulia Rasulullah SAW dalam mendidik anak." },
  ],
  2026: [
    { dateKey: "2026-01-16", name: "Isra Mi'raj Nabi Muhammad SAW", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Hikmah perjalanan Isra Mi'raj & perintah shalat bagi adik-adik binaan." },
    { dateKey: "2026-02-17", name: "Tahun Baru Imlek 2577", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Ucapan selamat Tahun Baru Imlek & pesan kerukunan." },
    { dateKey: "2026-03-19", name: "Hari Suci Nyepi (Tahun Baru Saka 1948)", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Menghormati kesunyian & refleksi diri dalam kerukunan beragama." },
    { dateKey: "2026-03-20", name: "Hari Raya Idul Fitri 1447 H", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Poster Selamat Hari Raya Idul Fitri: Taqabbalallahu Minna Wa Minkum." },
    { dateKey: "2026-03-21", name: "Hari Raya Idul Fitri 1447 H (Hari Ke-2)", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Kebahagiaan silaturahmi bersama keluarga & adik binaan." },
    { dateKey: "2026-04-03", name: "Wafat Yesus Kristus", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2026-05-14", name: "Kenaikan Yesus Kristus", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2026-05-27", name: "Hari Raya Idul Adha 1447 H", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Poster Idul Adha: Makna pengorbanan, keikhlasan, dan kepedulian berbagi." },
    { dateKey: "2026-05-31", name: "Hari Raya Waisak 2570", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2026-06-16", name: "Tahun Baru Islam 1448 H (1 Muharram)", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Menyambut Tahun Baru Hijriah dengan semangat hijrah menuju kebaikan." },
    { dateKey: "2026-08-25", name: "Maulid Nabi Muhammad SAW", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Meneladani akhlak mulia Rasulullah SAW dalam mendidik anak." },
  ],
  2027: [
    { dateKey: "2027-01-06", name: "Isra Mi'raj Nabi Muhammad SAW", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Hikmah perjalanan Isra Mi'raj & perintah shalat bagi adik-adik binaan." },
    { dateKey: "2027-02-06", name: "Tahun Baru Imlek 2578", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2027-03-09", name: "Hari Suci Nyepi (Tahun Baru Saka 1949)", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2027-03-10", name: "Hari Raya Idul Fitri 1448 H", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Poster Selamat Hari Raya Idul Fitri." },
    { dateKey: "2027-03-11", name: "Hari Raya Idul Fitri 1448 H (Hari Ke-2)", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2027-03-26", name: "Wafat Yesus Kristus", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2027-05-06", name: "Kenaikan Yesus Kristus", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2027-05-16", name: "Hari Raya Idul Adha 1448 H", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Poster Idul Adha: Makna pengorbanan & kepedulian berbagi." },
    { dateKey: "2027-05-20", name: "Hari Raya Waisak 2571", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2027-06-06", name: "Tahun Baru Islam 1449 H (1 Muharram)", isHoliday: true, category: "RELIGIOUS" },
    { dateKey: "2027-08-15", name: "Maulid Nabi Muhammad SAW", isHoliday: true, category: "RELIGIOUS", suggestedContent: "Meneladani akhlak mulia Rasulullah SAW." },
  ],
};

/**
 * Returns all Indonesian calendar events (holidays & commemorative days) for a given year.
 */
export function getIndonesianEventsForYear(year: number): IndonesianCalendarEvent[] {
  const result: IndonesianCalendarEvent[] = [];
  const map = new Map<string, IndonesianCalendarEvent>();

  // 1. Add annual fixed events for this year
  for (const annual of ANNUAL_INDONESIAN_EVENTS) {
    const dateKey = `${year}-${annual.monthDay}`;
    map.set(`${dateKey}-${annual.name}`, {
      dateKey,
      name: annual.name,
      isHoliday: annual.isHoliday,
      category: annual.category,
      suggestedContent: annual.suggestedContent,
    });
  }

  // 2. Add year-specific movable holidays
  const yearHolidays = YEAR_SPECIFIC_HOLIDAYS[year] || [];
  for (const h of yearHolidays) {
    const existing = map.get(`${h.dateKey}-${h.name}`);
    if (existing) {
      existing.isHoliday = existing.isHoliday || h.isHoliday;
    } else {
      map.set(`${h.dateKey}-${h.name}`, h);
    }
  }

  result.push(...map.values());
  result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return result;
}

/**
 * Returns all events falling within a specific month of a year.
 * @param month 0-indexed (0 = Jan, 11 = Dec)
 */
export function getIndonesianEventsForMonth(
  year: number,
  month: number,
): IndonesianCalendarEvent[] {
  const all = getIndonesianEventsForYear(year);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return all.filter((e) => e.dateKey.startsWith(monthPrefix));
}

/**
 * Returns a map of `dateKey` -> `IndonesianCalendarEvent[]` for a date range [start, end).
 */
export function getIndonesianEventsMapForRange(
  start: Date,
  end: Date,
): Map<string, IndonesianCalendarEvent[]> {
  const map = new Map<string, IndonesianCalendarEvent[]>();
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  const events: IndonesianCalendarEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    events.push(...getIndonesianEventsForYear(y));
  }

  const startKey = start.toISOString().slice(0, 10);
  const endKey = end.toISOString().slice(0, 10);

  for (const event of events) {
    if (event.dateKey >= startKey && event.dateKey <= endKey) {
      const existing = map.get(event.dateKey);
      if (existing) {
        existing.push(event);
      } else {
        map.set(event.dateKey, [event]);
      }
    }
  }

  return map;
}

/**
 * Returns upcoming events within `daysAhead` from a given date.
 */
export function getUpcomingIndonesianEvents(
  fromInstant: Date = new Date(),
  daysAhead = 14,
): Array<IndonesianCalendarEvent & { daysRemaining: number }> {
  const fromYear = fromInstant.getFullYear();
  const allEvents = [
    ...getIndonesianEventsForYear(fromYear),
    ...getIndonesianEventsForYear(fromYear + 1),
  ];

  // Midnight comparison in local time
  const startMidnight = new Date(
    fromInstant.getFullYear(),
    fromInstant.getMonth(),
    fromInstant.getDate(),
  ).getTime();

  const results: Array<IndonesianCalendarEvent & { daysRemaining: number }> = [];

  for (const event of allEvents) {
    const [y, m, d] = event.dateKey.split("-").map(Number);
    const eventTime = new Date(y, m - 1, d).getTime();
    const diffDays = Math.round((eventTime - startMidnight) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= daysAhead) {
      results.push({
        ...event,
        daysRemaining: diffDays,
      });
    }
  }

  results.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return results;
}
