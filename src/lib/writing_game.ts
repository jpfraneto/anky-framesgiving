import { SessionData } from "~/components/WritingGame";

export function extractSessionDataFromLongString(
  session_long_string: string
): SessionData {
  const lines = session_long_string.split("\n");
  const user_id = lines[0];
  const session_id = lines[1];
  const prompt = lines[2];
  const starting_timestamp = parseInt(lines[3]);

  let session_text = "";
  let total_time = 0;
  let total_chars = 0;
  const intervals: number[] = [];

  // Process each line starting from index 4
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Count leading spaces to detect space inputs
    const leadingSpaces = line.match(/^\s*/)?.[0]?.length ?? 0;

    if (leadingSpaces > 0) {
      // If there are leading spaces, user typed a space
      session_text += " ";
      const timestamp = parseFloat(line.trim());
      total_time += timestamp;
      total_chars += 1;
      intervals.push(timestamp);
    } else {
      // Handle regular characters and special keys
      const [char, timeStr] = line.split(/\s+/);
      const time = parseFloat(timeStr);
      total_time += time;
      total_chars += 1;
      intervals.push(time);

      if (char === "Backspace") {
        session_text = session_text.slice(0, -1);
      } else if (char === "Space" || char === "") {
        session_text += " ";
      } else if (char === "Enter") {
        session_text += "\n";
      } else if (char.length === 1) {
        session_text += char;
      }
    }
  }

  // Filter out multiple consecutive spaces and trim
  session_text = session_text.replace(/\s+/g, " ").trim();

  const word_count = session_text
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Calculate average time between keystrokes in milliseconds
  const avgKeystrokeTime = total_time / total_chars;

  // Calculate how many keystrokes can be made in a minute
  const keystrokesPerMinute = 60 / avgKeystrokeTime;

  // Assuming average word length of 5 characters plus a space (6 keystrokes per word)
  const average_wpm = Number((keystrokesPerMinute / 6).toFixed(2));

  // Calculate variance for flow score
  const variance =
    intervals.reduce((acc, interval) => {
      const diff = interval - avgKeystrokeTime;
      return acc + diff * diff;
    }, 0) / intervals.length;

  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation (CV) = stdDev / mean
  const cv = stdDev / avgKeystrokeTime;

  // Convert CV to a 0-100 score
  // Lower CV means more consistent typing (better flow)
  // Using exponential decay function to map CV to score
  const flow_score = Number((100 * Math.exp(-cv)).toFixed(2));

  const result = {
    user_id,
    session_id,
    prompt,
    starting_timestamp,
    session_text,
    total_time_written: 1000 * Math.floor(total_time + 8),
    word_count,
    average_wpm,
    flow_score,
  };

  return result;
}
