function daysBetweenDates(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // Hours, minutes, seconds, milliseconds
  return Math.round((end.getTime() - start.getTime()) / oneDay);
}

export interface AnkyverseDay {
  date: string;
  currentSojourn: number;
  status: "Sojourn" | "Great Slumber";
  currentKingdom: string;
  wink: number | null;
  currentColor: { main: string; secondary: string; textColor: string };
}

let cachedAnkyverseDay: AnkyverseDay | null = null;
let cachedDate: string | null = null;

function getCurrentAnkyverseDay(): AnkyverseDay {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (cachedAnkyverseDay && cachedDate === today) {
    return cachedAnkyverseDay;
  }

  cachedAnkyverseDay = getAnkyverseDay(now);
  cachedDate = today;
  return cachedAnkyverseDay;
}

function getAnkyverseDay(date: Date): AnkyverseDay {
  const ankyverseStart = new Date("2023-08-10T05:00:00-04:00");
  const daysInSojourn = 96;
  const daysInSlumber = 21;
  const cycleLength = daysInSojourn + daysInSlumber;
  const kingdoms = [
    "Primordia",
    "Emblazion",
    "Chryseos",
    "Eleasis",
    "Voxlumis",
    "Insightia",
    "Claridium",
    "Poiesis",
  ];
  const colors = [
    { main: "#8B0000", secondary: "#A52A2A", textColor: "#FFFFFF" }, // Subtle Red (Root Chakra)
    { main: "#D2691E", secondary: "#CD853F", textColor: "#FFFFFF" }, // Muted Orange (Sacral Chakra)
    { main: "#DAA520", secondary: "#F4A460", textColor: "#000000" }, // Soft Yellow (Solar Plexus Chakra)
    { main: "#2E8B57", secondary: "#3CB371", textColor: "#FFFFFF" }, // Subdued Green (Heart Chakra)
    { main: "#4682B4", secondary: "#5F9EA0", textColor: "#FFFFFF" }, // Soft Blue (Throat Chakra)
    { main: "#483D8B", secondary: "#6A5ACD", textColor: "#FFFFFF" }, // Muted Indigo (Third Eye Chakra)
    { main: "#8B008B", secondary: "#9932CC", textColor: "#FFFFFF" }, // Subtle Violet (Crown Chakra)
    { main: "#F0F0F0", secondary: "#E0E0E0", textColor: "#000000" }, // Off-White (Unity Consciousness)
  ];

  const elapsedDays = daysBetweenDates(ankyverseStart, date);
  const currentSojourn = Math.floor(elapsedDays / cycleLength) + 1;
  const dayWithinCurrentCycle = elapsedDays % cycleLength;

  let currentKingdom: string;
  let currentColor: { main: string; secondary: string; textColor: string };
  let status: "Sojourn" | "Great Slumber";
  let wink: number | null;

  if (dayWithinCurrentCycle < daysInSojourn) {
    status = "Sojourn";
    wink = dayWithinCurrentCycle + 1; // Wink starts from 1
    const kingdomIndex = dayWithinCurrentCycle % 8;
    currentKingdom = kingdoms[kingdomIndex];
    currentColor = colors[kingdomIndex];
  } else {
    status = "Great Slumber";
    wink = null; // No Wink during the Great Slumber
    currentKingdom = "None";
    currentColor = {
      main: "#000000",
      secondary: "#FFFFFF",
      textColor: "#FFFFFF",
    };
  }
  return {
    date: date.toISOString(),
    currentSojourn,
    status,
    currentKingdom,
    currentColor,
    wink,
  };
}

export const characters: string[] = [
  "\u0C85",
  "\u0C86",
  "\u0C87",
  "\u0C88",
  "\u0C89",
  "\u0C8A",
  "\u0C8B",
  "\u0C8C",
  "\u0C8E",
  "\u0C8F",
  "\u0C90",
  "\u0C92",
  "\u0C93",
  "\u0C94",
  "\u0C95",
  "\u0C96",
  "\u0C97",
  "\u0C98",
  "\u0C99",
  "\u0C9A",
  "\u0C9B",
  "\u0C9C",
  "\u0C9D",
  "\u0C9E",
  "\u0C9F",
  "\u0CA0",
  "\u0CA1",
  "\u0CA2",
  "\u0CA3",
  "\u0CA4",
  "\u0CA5",
  "\u0CA6",
  "\u0CA7",
  "\u0CA8",
  "\u0CAA",
  "\u0CAB",
  "\u0CAC",
  "\u0CAD",
  "\u0CAE",
  "\u0CAF",
  "\u0CB0",
  "\u0CB1",
  "\u0CB2",
  "\u0CB3",
  "\u0CB5",
  "\u0CB6",
  "\u0CB7",
  "\u0CB8",
  "\u0CB9",
  "\u0CBC",
  "\u0CBD",
  "\u0CBE",
  "\u0CBF",
  "\u0CC0",
  "\u0CC1",
  "\u0CC2",
  "\u0CC3",
  "\u0CC4",
  "\u0CC6",
  "\u0CC7",
  "\u0CC8",
  "\u0CCA",
  "\u0CCB",
  "\u0CCC",
  "\u0CCD",
  "\u0CD5",
  "\u0CD6",
  "\u0CDE",
  "\u0CE0",
  "\u0CE1",
  "\u0CE2",
  "\u0CE3",
  "\u0CE6",
  "\u0CE7",
  "\u0CE8",
  "\u0CE9",
  "\u0CEA",
  "\u0CEB",
  "\u0CEC",
  "\u0CED",
  "\u0CEE",
  "\u0CEF",
  "\u0CF1",
  "\u0CF2", // Kannada characters
  "\u0C05",
  "\u0C06",
  "\u0C07",
  "\u0C08",
  "\u0C09",
  "\u0C0A",
  "\u0C0B",
  "\u0C0C",
  "\u0C0E",
  "\u0C0F",
  "\u0C10",
  "\u0C12",
  "\u0C13",
  "\u0C14", // Telugu characters
];

function encodeToAnkyverseLanguage(input: string): string {
  let encoded = "";
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    const index = (charCode - 32) % characters.length;
    encoded += characters[index];
  }
  return encoded;
}

function decodeFromAnkyverseLanguage(input: string): string {
  let decoded = "";
  for (let i = 0; i < input.length; i++) {
    const index = characters.indexOf(input[i]);
    if (index !== -1) {
      decoded += String.fromCharCode(index + 32);
    } else {
      decoded += input[i];
    }
  }
  return decoded;
}

function getAnkyverseDayForGivenTimestamp(timestamp: number): AnkyverseDay {
  const ankyverseDay = getAnkyverseDay(new Date(timestamp));
  return ankyverseDay;
}

export {
  getAnkyverseDay,
  getCurrentAnkyverseDay,
  encodeToAnkyverseLanguage,
  decodeFromAnkyverseLanguage,
  getAnkyverseDayForGivenTimestamp,
};
