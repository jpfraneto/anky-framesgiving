import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  ChangeEvent,
} from "react";
import sdk, { type FrameContext } from "@farcaster/frame-sdk";
import { useAccount, useWriteContract } from "wagmi";

import ankyFramesgivingAbi from "../lib/ankyFramesgivingAbi.json";

import axios from "axios";
import Image from "next/image";
import { ethers } from "ethers";
import Link from "next/link";

const INACTIVITY_TIMEOUT = 8000; // 8 seconds
const SESSION_TIMEOUT = 8 * 60 * 1000; // 8 minutes

const ANKY_FRAMESGIVING_CONTRACT_ADDRESS =
  "0x69ef462BC8B02e42849efC6Dced51b8FCc1babe8";

type AnkyMetadata = {
  metadata_ipfs_hash: string;
  ticker: string;
  token_name: string;
  image_ipfs_hash: string;
  description: string;
};

export default function WritingGame() {
  const [sessionLongString, setSessionLongString] = useState("");
  const [writingSessionEnded, setWritingSessionEnded] = useState(false);
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [inactiveTime, setInactiveTime] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  const [isFarcasterClient, setIsFarcasterClient] = useState(false);
  const [ankyMetadataRequestPending, setAnkyMetadataRequestPending] =
    useState(false);
  const [sessionStartTimestamp, setSessionStartTimestamp] = useState<
    number | null
  >(null);
  const [ankyMetadata, setAnkyMetadata] = useState<AnkyMetadata | null>(null);

  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const lastKeystrokeTimeRef = useRef<number | null>(null);
  const keystrokeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ankyGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ankyMetadataPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // SDK state
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<FrameContext>();

  const resetSession = useCallback(async () => {
    setText("");
    setSessionActive(false);
    setInactiveTime(0);
    setSessionTime(0);
    setSessionLongString("");
    setWritingSessionEnded(false);
    lastKeystrokeTimeRef.current = null;

    if (keystrokeTimeoutRef.current) {
      clearTimeout(keystrokeTimeoutRef.current);
    }

    try {
      const response = await fetch(
        "https://farcaster.anky.bot/framesgiving/prepare-writing-session"
      );
      const data = await response.json();
      setPrompt(data.upcomingPrompt);
      setSessionId(data.sessionId || Date.now().toString());
    } catch (error) {
      console.error("Error preparing session:", error);
    }
  }, []);

  const startSession = async () => {
    setSessionActive(true);
    try {
      await fetch(
        "https://farcaster.anky.bot/framesgiving/start-writing-session",
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      let sdkContext: FrameContext;
      try {
        sdkContext = await sdk.context;
        console.log("SDK Context loaded:", sdkContext);
        setIsFarcasterClient(false);
        setContext(sdkContext);
        await resetSession();
        sdk.actions.ready();
      } catch (error) {
        console.log("there was an error loading the sdk", error);
        setIsFarcasterClient(false);
        setPrompt("what are you grateful for?");
        await resetSession();
        sdk.actions.ready();
      }
    };
    console.log("in heeeree");
    if (sdk && !isSDKLoaded) {
      console.log("SDK available and not loaded, initializing...");
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  useEffect(() => {
    if (!sessionActive) return;

    const timer = setInterval(() => {
      const now = Date.now();

      if (lastKeystrokeTimeRef.current) {
        setSessionTime(
          Math.min(now - lastKeystrokeTimeRef.current, SESSION_TIMEOUT)
        );
        const timeSinceLastKeystroke = now - lastKeystrokeTimeRef.current;
        setInactiveTime(Math.min(timeSinceLastKeystroke, INACTIVITY_TIMEOUT));
        // setTimeLeft(Math.max(0, INACTIVITY_TIMEOUT - timeSinceLastKeystroke));
      }
    }, 100);

    return () => clearInterval(timer);
  }, [sessionActive]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const currentTime = Date.now();
    const newValue = e.target.value;
    const lastChar = newValue.slice(-1);

    if (!sessionActive) {
      startSession();
      setSessionStartTimestamp(currentTime);
    }

    if (keystrokeTimeoutRef.current) {
      clearTimeout(keystrokeTimeoutRef.current);
    }

    lastKeystrokeTimeRef.current = currentTime;
    setText(newValue);

    // Calculate time delta
    const timeDelta =
      currentTime - (lastKeystrokeTimeRef.current ?? currentTime);

    // Add keystroke data to session long string
    setSessionLongString(
      (prev) => prev + `\n${lastChar} ${(timeDelta / 1000).toFixed(3)}`
    );

    const ankyGenerationTimeout = setTimeout(() => {
      sendAnkyImageRequest();
    }, SESSION_TIMEOUT * 0.88);

    const timeout = setTimeout(() => {
      const finalSessionLongString =
        `${
          context?.user.fid || 16098
        }\n${sessionId}\n${prompt}\n${currentTime}` + sessionLongString;
      setSessionLongString(finalSessionLongString);
      console.log("sending the new session long string to the server");
      setWritingSessionEnded(true);
      if (address) {
        endWritingSession(finalSessionLongString, address);
      }
    }, 8000);

    keystrokeTimeoutRef.current = timeout;
    ankyGenerationTimeoutRef.current = ankyGenerationTimeout;
  };

  const inactivityProgress = (inactiveTime / INACTIVITY_TIMEOUT) * 100;
  const sessionProgress = (sessionTime / SESSION_TIMEOUT) * 100;

  const sendAnkyImageRequest = async () => {
    try {
      setAnkyMetadataRequestPending(true);
      const options = {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        url: `https://farcaster.anky.bot/framesgiving/create-anky-image-from-long-string`,
        data: {
          session_long_string: sessionLongString,
        },
      };
      const response = await axios.request(options);
      console.log("the response is: ", response.data);
      if (response.data.success) {
        setAnkyMetadataRequestPending(true);
      }
      const ankyMetadataPollingInterval = setInterval(
        pollAnkyMetadataRequest,
        10000
      );
      ankyMetadataPollingIntervalRef.current = ankyMetadataPollingInterval;
    } catch (error) {
      console.error("Error sending anky image request:", error);
    }
  };

  const pollAnkyMetadataRequest = async () => {
    if (ankyGenerationTimeoutRef.current) {
      clearTimeout(ankyGenerationTimeoutRef.current);
    }
    try {
      const options = {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        url: `https://farcaster.anky.bot/framesgiving/fetch-anky-metadata-status`,
        data: {
          session_id: sessionId,
        },
      };
      const response = await axios.request(options);
      console.log("the response is: ", response.data);
      if (response.data.anky_metadata.success) {
        setAnkyMetadata(response.data.anky_metadata);
        setAnkyMetadataRequestPending(false);
      }
    } catch (error) {
      console.error("Error polling anky metadata request:", error);
    }
  };

  const endWritingSession = async (
    sessionLongString: string,
    address: string
  ) => {
    try {
      const response = await axios.post(
        "https://farcaster.anky.bot/framesgiving/end-writing-session",
        {
          text: sessionLongString,
          address: address,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log(
        "the response from ending the writing session is: ",
        response
      );
      // todo: here we should get the reply from anky based on the session stats
      return response.data;
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const deployAnky = async () => {
    if (!isFarcasterClient || !ankyMetadata) return;

    try {
      // Hash the session string
      const sessionHash = ethers.keccak256(
        ethers.toUtf8Bytes(sessionLongString)
      );
      const options = {
        method: "POST",
        url: `https://farcaster.anky.bot/framesgiving/get-anky-metadata`,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };
      const response = await axios.request(options);
      console.log("the response here is: ", response);

      // Send the hash on-chain
      const responseFromContract = await writeContract({
        abi: ankyFramesgivingAbi,
        address: ANKY_FRAMESGIVING_CONTRACT_ADDRESS,
        functionName: "deployAnky",
        args: [sessionHash],
      });
      console.log("the response from the contract is: ", responseFromContract);
      return responseFromContract;
    } catch (error) {
      console.error("Error deploying Anky:", error);
    }
  };

  if (!address)
    return (
      <div className="flex flex-col items-center justify-center h-full text-white text-2xl p-4">
        <p>you need to access this frame from inside a farcaster client</p>
        <div className="flex items-center justify-center p-2 bg-white rounded-lg mt-4">
          <Link href="https://warpcast.com" className="shadow-lg shadow-white">
            <Image
              src="https://warpcast.com/og-logo.png"
              alt="warpcast logo"
              width={100}
              height={100}
            />
          </Link>
        </div>
      </div>
    );

  if (writingSessionEnded) {
    const elapsedTime = sessionStartTimestamp
      ? Date.now() - sessionStartTimestamp
      : 0;
    if (elapsedTime >= SESSION_TIMEOUT && isFarcasterClient) {
      return (
        <UserWonTheGame
          ankyMetadata={ankyMetadata!}
          deployAnky={deployAnky}
          ankyMetadataRequestPending={ankyMetadataRequestPending}
        />
      );
    } else {
      return (
        <SessionComplete
          sessionLongString={sessionLongString}
          onReset={resetSession}
          context={context!}
        />
      );
    }
  }

  return (
    <div className="flex flex-col w-full h-[333px]">
      <LifeBar inactivityProgress={inactivityProgress} />
      <AnkyProgressBar sessionProgress={sessionProgress} />
      <WritingComponent
        writing={text}
        prompt={prompt}
        handleTextChange={handleTextChange}
      />
    </div>
  );
}

function UserWonTheGame({
  deployAnky,
  ankyMetadata,
  ankyMetadataRequestPending,
}: {
  deployAnky: () => void;
  ankyMetadata: AnkyMetadata;
  ankyMetadataRequestPending: boolean;
}) {
  if (ankyMetadataRequestPending) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-8">
        <p>you wrote an anky</p>
        <p>it is being generated as you read these words</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full pt-8">
      <Image
        src={`https://anky.mypinata.cloud/ipfs/${ankyMetadata?.image_ipfs_hash}`}
        alt="anon"
        width={300}
        height={300}
      />
      <p className="text-white text-2xl">${ankyMetadata.ticker}</p>
      <p className="text-white text-2xl">${ankyMetadata.token_name}</p>
      <div className="text-white text-2xl">
        <button onClick={deployAnky}>deploy anky</button>
      </div>
    </div>
  );
}

function LifeBar({ inactivityProgress }: { inactivityProgress: number }) {
  return (
    <div
      className="h-2 bg-blue-500 transition-all duration-100"
      style={{
        width: `${inactivityProgress}%`,
      }}
    />
  );
}

function AnkyProgressBar({
  sessionProgress,
}: {
  sessionProgress: number | null;
}) {
  console.log("the sessionProgress is: ", sessionProgress);
  return (
    <div
      className="h-4 bg-green-600 transition-all duration-100"
      style={{
        width: `${sessionProgress}%`,
      }}
    />
  );
}

function WritingComponent({
  writing,
  prompt,
  handleTextChange,
}: {
  writing: string;
  prompt: string;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
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
      className="w-full grow p-4 text-gray-300 bg-black placeholder:text-gray-400 text-2xl"
      placeholder={streamedPrompt}
      autoCorrect="off"
      autoComplete="off"
      autoCapitalize="off"
      spellCheck="false"
      value={writing}
      onChange={handleTextChange}
    />
  );
}

function SessionComplete({
  sessionLongString,
  onReset,
  context,
}: {
  sessionLongString: string;
  onReset: (context: FrameContext) => void;
  context: FrameContext;
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

      <div className="w-full flex gap-4 items-center justify-center">
        <button
          onClick={async () => {
            const new_cast_text = await ankyEditUserWriting(
              sessionLongString,
              context.user.fid
            );
            console.log("the new cast text is: ", new_cast_text);
            // todo: open the cast composer with the new cast text
          }}
          className="text-7xl py-4"
        >
          edit and cast
        </button>
        <button onClick={() => onReset(context)} className="text-7xl py-4">
          🔄
        </button>
      </div>
    </div>
  );
}

export async function ankyEditUserWriting(
  sessionLongString: string,
  fid: number
) {
  console.log("editing user writing");
  // todo: needs to be less than 1000 characters long
  try {
    const options = {
      method: "POST",
      url: `https://poiesis.anky.bot/framesgiving/edit-user-writing`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: {
        fid,
        session_long_string: sessionLongString,
      },
    };
    const response = await axios.request(options);
    console.log("the response is: ", response);
    return response.data;
  } catch (error) {
    console.error("Error editing user writing:", error);
    // todo: send to claude or chatgtp
    return { cast_text: "hello world, this is the edited cast text" };
  }
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
