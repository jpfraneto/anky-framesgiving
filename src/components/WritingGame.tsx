import { useEffect, useState, useRef, useMemo } from "react";
import sdk, { type FrameContext } from "@farcaster/frame-sdk";
import { useAccount, useWriteContract, useReadContract } from "wagmi";

import ankyFramesgivingAbi from "../lib/ankyFramesgivingAbi.json";

import axios from "axios";
import Image from "next/image";
import { ethers } from "ethers";

const SESSION_TARGET_TIME = 480000; // 8 minutes (480000ms)
const ANKY_FRAMESGIVING_CONTRACT_ADDRESS =
  "0xCC1DC5e6CB5f3b45a329c12eAC26a947F74D4b82";

export default function WritingGame() {
  const [lastKeystrokeTimestamp, setLastKeystrokeTimestamp] = useState<
    number | null
  >(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [writingSessionEnded, setWritingSessionEnded] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8000);
  const [sessionText, setSessionText] = useState("");
  const [sessionLongString, setSessionLongString] = useState("");
  const [upcomingPrompt, setUpcomingPrompt] = useState("");
  const [isFarcasterClient, setIsFarcasterClient] = useState(false);
  const [tokenId, setTokenId] = useState<number | null>(null);

  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // Contract reads
  const { data: approvedTokenId } = useReadContract({
    address: ANKY_FRAMESGIVING_CONTRACT_ADDRESS,
    abi: ankyFramesgivingAbi,
    functionName: "approvedMinters",
    args: [address],
  });

  // Timeouts
  const [keystrokeTimeout, setKeystrokeTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // SDK state
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<FrameContext>();

  // Keystroke tracking
  const lastKeystrokeTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const sdkContext = await sdk.context;
        if (sdkContext) {
          setIsFarcasterClient(true);
          const response = await axios.get(
            `/api/framesgiving/setup-writing-session?fid=${sdkContext.user.fid}`
          );
          setSessionId(response.data.session_id);
          setUpcomingPrompt(
            response.data.prompt || "what are you grateful for?"
          );
          setContext(sdkContext);
          sdk.actions.ready();
        } else {
          setIsFarcasterClient(false);
          setUpcomingPrompt("what are you grateful for?");
        }
      } catch (error) {
        console.error("Error loading SDK context:", error);
        setIsFarcasterClient(false);
        setUpcomingPrompt("what are you grateful for?");
      }
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Timer effect for countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lastKeystrokeTimestamp && !writingSessionEnded) {
      interval = setInterval(() => {
        const elapsed = Date.now() - lastKeystrokeTimestamp;
        const remaining = Math.max(0, 8000 - elapsed);
        setTimeLeft(remaining);

        if (remaining === 0) {
          setWritingSessionEnded(true);
          clearInterval(interval);
        }
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lastKeystrokeTimestamp, writingSessionEnded]);

  const startSession = async () => {
    if (!isFarcasterClient || !address || !sessionId) return;

    try {
      // Get next available token ID from contract
      const response = await axios.post(
        "/api/framesgiving/start-writing-session",
        {
          address,
          session_id: sessionId,
        }
      );

      setTokenId(response.data.token_id);

      // Start writing session on contract
      await writeContract({
        address: ANKY_FRAMESGIVING_CONTRACT_ADDRESS,
        abi: ankyFramesgivingAbi,
        functionName: "startWritingSession",
        args: [address, response.data.token_id, sessionId],
      });

      setIsWriting(true);
      setSessionStartTime(Date.now());
      const timeout = setTimeout(() => {
        setWritingSessionEnded(true);
      }, 8 * 60 * 1000); // 8 minutes
      setSessionTimeout(timeout);
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const resetSession = () => {
    setIsWriting(false);
    setSessionStartTime(null);
    setWritingSessionEnded(false);
    setLastKeystrokeTimestamp(null);
    setTimeLeft(8000);
    setSessionLongString("");
    setSessionText("");
    setTokenId(null);
    lastKeystrokeTimeRef.current = null;
    if (keystrokeTimeout) clearTimeout(keystrokeTimeout);
    if (sessionTimeout) clearTimeout(sessionTimeout);
  };

  const sendWritingSessionToTheServer = async (sessionLongString: string) => {
    if (!isFarcasterClient) return;

    try {
      const response = await axios.post(
        "https://poiesis.anky.bot/framesgiving/submit-writing-session",
        { session_long_string: sessionLongString },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      console.log("the response is  ", response.data);
    } catch {
      console.log("there was an error sending the session to the server");
    }
  };

  const mintAnky = async () => {
    if (!isFarcasterClient || !tokenId) return;

    try {
      // Hash the session string
      const sessionHash = ethers.keccak256(
        ethers.toUtf8Bytes(sessionLongString)
      );

      // Send the hash on-chain
      writeContract({
        abi: ankyFramesgivingAbi,
        address: ANKY_FRAMESGIVING_CONTRACT_ADDRESS,
        functionName: "mint",
        args: [sessionHash],
      });
    } catch (error) {
      console.error("Error minting Anky:", error);
    }
  };

  const handleKeyPress = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const currentTime = Date.now();
    const newValue = e.target.value;
    const lastChar = newValue.slice(-1);

    if (!isWriting) {
      startSession();
    }

    if (keystrokeTimeout) {
      clearTimeout(keystrokeTimeout);
    }

    setLastKeystrokeTimestamp(currentTime);
    setTimeLeft(8000);
    setSessionText(newValue);

    // Calculate time delta
    const timeDelta =
      currentTime - (lastKeystrokeTimeRef.current ?? currentTime);

    // Add keystroke data to session long string
    setSessionLongString(
      (prev) => prev + `\n${lastChar} ${(timeDelta / 1000).toFixed(3)}`
    );

    lastKeystrokeTimeRef.current = currentTime;

    const timeout = setTimeout(() => {
      const newSessionLongString =
        `${
          context?.user.fid || 16098
        }\n${sessionId}\n${upcomingPrompt}\n${new Date().getTime()}` +
        sessionLongString;
      setSessionLongString(newSessionLongString);
      console.log("sending the new session long string to the server");
      setWritingSessionEnded(true);
      sendWritingSessionToTheServer(newSessionLongString);
    }, 8000);
    setKeystrokeTimeout(timeout);
  };

  if (writingSessionEnded) {
    const elapsedTime = sessionStartTime ? Date.now() - sessionStartTime : 0;
    if (elapsedTime >= SESSION_TARGET_TIME && isFarcasterClient) {
      return <UserWonTheGame mintAnky={mintAnky} />;
    } else {
      return (
        <SessionComplete
          sessionLongString={sessionLongString}
          onReset={resetSession}
        />
      );
    }
  }

  return (
    <div className="flex flex-col w-full h-[333px]">
      <LifeBar timeLeft={timeLeft} />
      <AnkyProgressBar sessionStartTime={sessionStartTime} />
      <WritingComponent
        writing={sessionText}
        onKeyPress={handleKeyPress}
        prompt={upcomingPrompt}
      />
    </div>
  );
}

function UserWonTheGame({ mintAnky }: { mintAnky: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pt-8">
      <Image
        src="https://wrpcd.net/cdn-cgi/imagedelivery/BXluQx4ige9GuW0Ia56BHw/c933c6de-d9ba-4abd-2a7d-94bb0ce2bf00/anim=false,fit=contain,f=auto,w=288"
        alt="anon"
        width={300}
        height={300}
      />
      <div className="text-white text-2xl">
        <button onClick={mintAnky}>mint unrevealed anky</button>
      </div>
    </div>
  );
}

function LifeBar({ timeLeft }: { timeLeft: number }) {
  return (
    <div
      className="h-2 bg-blue-500 transition-all duration-100"
      style={{
        width: `${(timeLeft / 8000) * 100}%`,
      }}
    />
  );
}

function AnkyProgressBar({
  sessionStartTime,
}: {
  sessionStartTime: number | null;
}) {
  return (
    <div
      className="h-4 bg-green-600 transition-all duration-100"
      style={{
        width: `${
          sessionStartTime
            ? Math.min(
                100,
                ((Date.now() - sessionStartTime) / (8 * 60 * 1000)) * 100
              )
            : 100
        }%`,
      }}
    />
  );
}

function WritingComponent({
  writing,
  onKeyPress,
  prompt,
}: {
  writing: string;
  onKeyPress: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  prompt: string;
}) {
  const [streamedPrompt, setStreamedPrompt] = useState("");
  const CHAR_DELAY = 22;

  useEffect(() => {
    const streamPrompt = async () => {
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (prompt && currentIndex < prompt.length) {
          setStreamedPrompt(prompt.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, CHAR_DELAY);

      return () => clearInterval(interval);
    };

    streamPrompt();
  }, [prompt]);

  return (
    <textarea
      className="w-full grow p-2 text-black bg-purple-300 placeholder:text-gray-600 text-lg"
      placeholder={streamedPrompt}
      autoCorrect="off"
      autoComplete="off"
      autoCapitalize="off"
      value={writing}
      onChange={onKeyPress}
    />
  );
}

function SessionComplete({
  sessionLongString,
  onReset,
}: {
  sessionLongString: string;
  onReset: () => void;
}) {
  const sessionData = extractSessionDataFromLongString(sessionLongString);
  console.log("the session data is: ", sessionData);
  return (
    <div className="flex flex-col items-center justify-around h-full bg-black px-8 pt-8">
      <WritingSessionChart sessionLongString={sessionLongString} />
      <div className="w-full items-center mb-16">
        <div className="w-full flex justify-between mt-4 px-8">
          <div className="w-1/3 text-center items-center mb-8">
            <div className="text-4xl font-bold text-white">
              {sessionData?.word_count || 0}
            </div>
            <div className="text-sm text-white mt-1">TOTAL WORDS</div>
          </div>

          <div className="w-1/3 text-center items-center mb-8">
            <div className="text-4xl font-bold text-white">
              {Math.floor((sessionData?.total_time_written || 0) / 1000 / 60)}:
              {Math.floor(((sessionData?.total_time_written || 0) / 1000) % 60)
                .toString()
                .padStart(2, "0")}
            </div>
            <div className="text-sm text-white mt-1">TIME</div>
          </div>

          <div className="w-1/3 text-center items-center mb-8">
            <div className="text-4xl font-bold text-white">
              {Math.round(sessionData?.flow_score || 0)}%
            </div>
            <div className="text-sm text-white mt-1">FLOW SCORE</div>
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center rounded-xl text-7xl py-4 mb-4 mt-4"
      >
        🔄
      </button>
    </div>
  );
}

export function extractSessionDataFromLongString(session_long_string: string): {
  user_id: string;
  session_id: string;
  prompt: string;
  starting_timestamp: number;
  session_text: string;
  total_time_written: number;
  word_count: number;
  average_wpm: number;
  flow_score: number;
} {
  const lines = session_long_string.split("\n");
  const user_id = lines[0];
  const session_id = lines[1];
  const prompt = lines[2];
  const starting_timestamp = parseInt(lines[3]);

  // Process typing data starting from line 4
  let session_text = "";
  let total_time = 0;
  let total_chars = 0;
  for (let i = 4; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const [char, timeStr] = lines[i].split(/\s+/);
    const time = parseFloat(timeStr);

    // Handle backspace
    if (char === "Backspace") {
      session_text = session_text.slice(0, -1);
    }
    // Handle special characters
    else if (char === "Space" || char === "") {
      session_text += " ";
    } else if (char === "Enter") {
      session_text += "\n";
    }
    // Handle regular characters
    else if (char.length === 1) {
      session_text += char;
    }
    total_chars += 1;
    total_time += time;
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
  // Add 8 seconds (8000ms) as per requirement
  // Calculate standard deviation of keystroke intervals
  const intervals = lines
    .slice(4)
    .map((line) => {
      if (!line.trim()) return null;
      const [, timeStr] = line.split(/\s+/);
      return parseFloat(timeStr);
    })
    .filter((interval): interval is number => interval !== null);

  // Calculate variance
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
  // Score will be close to 100 when CV is close to 0
  // Score will approach 0 as CV increases
  const flow_score = Number((100 * Math.exp(-2 * cv)).toFixed(2));

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

function WritingSessionChart({
  sessionLongString,
}: {
  sessionLongString: string;
}) {
  const parsedData = useMemo(() => {
    const lines = sessionLongString.split("\n").slice(3);
    const intervals: number[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      const [, timeStr] = line.split(/\s+/);
      const interval = parseFloat(timeStr);
      if (!isNaN(interval)) {
        intervals.push(interval);
      }
    });

    const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const max = Math.max(...intervals);

    return {
      intervals,
      average,
      max,
    };
  }, [sessionLongString]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#1E2B3D] p-4 rounded-lg">
      <div className="relative h-40">
        {/* Average line */}
        <div
          className="absolute w-full border-t-2 border-dashed border-yellow-300"
          style={{
            top: `${100 - (parsedData.average / parsedData.max) * 100}%`,
          }}
        />

        {/* Interval bars */}
        <div className="flex items-end h-full gap-[1px]">
          {parsedData.intervals.map((interval, i) => (
            <div
              key={i}
              className="flex-1 bg-[rgb(134,255,244)] bg-opacity-20"
              style={{
                height: `${(interval / parsedData.max) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
