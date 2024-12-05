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

const SESSION_TIMEOUT = 8 * 60 * 1000; // 8 minutes

const ANKY_FRAMESGIVING_CONTRACT_ADDRESS =
  "0x286b7584c19d8813b3c8216e9933fba159c99725";

type AnkyMetadata = {
  metadata_ipfs_hash: string;
  ticker: string;
  token_name: string;
  image_ipfs_hash: string;
  description: string;
};

export default function WritingGame() {
  console.log("INSIDE THE WRITING GAME");
  const [lastKeystrokeTimestamp, setLastKeystrokeTimestamp] = useState<
    number | null
  >(null);
  const [writingSessionEnded, setWritingSessionEnded] = useState(false);
  const [sessionLongString, setSessionLongString] = useState("");
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8000);

  const [isFarcasterClient, setIsFarcasterClient] = useState(false);
  const [ankyMetadataRequestPending, setAnkyMetadataRequestPending] =
    useState(false);
  const [alreadyLoaded, setAlreadyLoaded] = useState(false);
  const [sessionStartTimestamp, setSessionStartTimestamp] = useState<
    number | null
  >(null);
  const [ankyMetadata, setAnkyMetadata] = useState<AnkyMetadata | null>(null);

  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const lastKeystrokeTimeRef = useRef<number | null>(null);
  const keystrokeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ankyGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // SDK state
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<FrameContext>();

  const resetSession = useCallback(async () => {
    console.log("THE RESET SESSION FUNCTION IS RUNNING NOW");
    setText("");
    setSessionActive(false);
    setTimeLeft(8000);
    setSessionLongString("");
    setWritingSessionEnded(false);
    lastKeystrokeTimeRef.current = null;

    if (keystrokeTimeoutRef.current) {
      clearTimeout(keystrokeTimeoutRef.current);
    }

    try {
      const response = await fetch(
        `https://farcaster.anky.bot/framesgiving/prepare-writing-session?fid=${context?.user.fid}&userWallet=${address}`
      );
      const data = await response.json();
      setPrompt(data.upcomingPrompt);
      setSessionId(data.sessionId || Date.now().toString());
    } catch (error) {
      console.error("Error preparing session:", error);
    }
  }, []);

  const prepareWritingSession = (() => {
    let hasRun = false;

    return async (userContext: FrameContext, userAddress: string) => {
      if (!userContext?.user || !userAddress) return;
      if (hasRun) return;

      hasRun = true;
      try {
        const response = await fetch(
          `https://farcaster.anky.bot/framesgiving/prepare-writing-session?fid=${userContext.user.fid}&userWallet=${userAddress}`
        );

        const data = await response.json();

        const parsedLongString = data.split("\n");
        // const fid = parsedLongString[0];
        const sessionId = parsedLongString[1];
        const thisSessionPrompt = parsedLongString[2];
        // const timestamp = parsedLongString[3];

        setPrompt(thisSessionPrompt);
        setSessionId(sessionId);
      } catch (error) {
        console.error("Error preparing writing session:", error);
        setPrompt("tell us who you are");
        setSessionId(crypto.randomUUID());
      }
    };
  })();

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
      console.log("Starting load function");
      console.log("Initial conditions:", { alreadyLoaded, sdk, isSDKLoaded });

      if (alreadyLoaded || !sdk || isSDKLoaded) {
        console.log("Exiting early due to conditions");
        return;
      }

      setAlreadyLoaded(true);
      setIsSDKLoaded(true);
      console.log("Set loaded states to true");

      let sdkContext: FrameContext;
      try {
        console.log("Attempting to get SDK context");
        sdkContext = await sdk.context;
        console.log("Got SDK context:", sdkContext);

        setContext(sdkContext);
        console.log("Set context");

        await prepareWritingSession(sdkContext, address || "");
        console.log("Prepared writing session");

        sdk.actions.ready();
        console.log("Called sdk.actions.ready()");
      } catch (error) {
        console.log("Error in load function:", error);
        setIsFarcasterClient(false);
        setPrompt("tell us who you are");
        setSessionId(crypto.randomUUID());
        sdk.actions.ready();
        console.log("Set fallback values after error");
      }
    };

    console.log("Calling load function");
    load();
  }, [sdk, isSDKLoaded, alreadyLoaded]);

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
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    console.log("Handling text change");
    const currentTime = Date.now();
    const newValue = e.target.value;
    const lastChar = newValue.slice(-1);

    if (!sessionActive) {
      console.log("Starting new session");
      startSession();
      setSessionStartTimestamp(currentTime);
    }

    if (keystrokeTimeoutRef.current) {
      console.log("Clearing existing keystroke timeout");
      clearTimeout(keystrokeTimeoutRef.current);
    }

    console.log("Updating timestamps and text");
    setLastKeystrokeTimestamp(currentTime);
    setTimeLeft(8000);
    setText(newValue);

    // Calculate time delta
    const timeDelta =
      currentTime - (lastKeystrokeTimeRef.current ?? currentTime);
    console.log("Time delta:", timeDelta);

    // Add keystroke data to session long string
    setSessionLongString(
      (prev) => prev + `\n${lastChar} ${(timeDelta / 1000).toFixed(3)}`
    );

    lastKeystrokeTimeRef.current = currentTime;

    const timeout = setTimeout(() => {
      console.log("Session timeout reached");
      const finalSessionLongString =
        `${
          context?.user.fid || 16098
        }\n${sessionId}\n${prompt}\n${currentTime}` + sessionLongString;
      console.log("Final session string:", finalSessionLongString);
      setSessionLongString(finalSessionLongString);
      setWritingSessionEnded(true);
      if (address) {
        console.log("Sending session to server");
        endWritingSession(finalSessionLongString, address);
      }
    }, 8000);

    keystrokeTimeoutRef.current = timeout;

    // Set anky generation timeout
    if (ankyGenerationTimeoutRef.current) {
      console.log("Clearing existing anky generation timeout");
      clearTimeout(ankyGenerationTimeoutRef.current);
    }
    const ankyGenerationTimeout = setTimeout(() => {
      console.log("Triggering anky image request");
      sendAnkyImageRequest();
    }, SESSION_TIMEOUT * 0.88);
    ankyGenerationTimeoutRef.current = ankyGenerationTimeout;
  };
  const ankyverseStart = new Date("2023-08-10T05:00:00-04:00");
  console.log("The ankyverse start date is: ", ankyverseStart.getTime());

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
          fid: context?.user.fid,
        },
      };
      const response = await axios.request(options);
      console.log("the response is: ", response.data);
      if (response.data) {
        const ankyMetadataTimeout = setTimeout(() => {
          if (
            ankyGenerationTimeoutRef.current &&
            ankyMetadata?.image_ipfs_hash
          ) {
            clearTimeout(ankyGenerationTimeoutRef.current);
          }
          pollAnkyMetadataRequest();
        }, 1000);
        ankyGenerationTimeoutRef.current = ankyMetadataTimeout;
      }

      // TODO: get the image here
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
          session_long_string: sessionLongString,
          userWallet: address,
          fid: context?.user.fid,
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
    if (!isFarcasterClient) return;

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
      <LifeBar timeLeft={timeLeft} />
      <AnkyProgressBar sessionStartTime={sessionStartTimestamp} />
      <WritingComponent
        text={text}
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
  text,
  prompt,
  handleTextChange,
}: {
  text: string;
  prompt: string;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  console.log("the prompt is: ", prompt);
  console.log("the prompt is: ", prompt);
  console.log("the prompt is: ", prompt);
  console.log("the prompt is: ", prompt);
  console.log("the prompt is: ", prompt);
  console.log("the prompt is: ", prompt);
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
      value={text}
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
            sdk.actions.openUrl(
              `https://warpcast.com/~/compose?text=${encodeURIComponent(
                sessionData.session_text
              )}`
            );
          }}
          className="text-7xl py-4 bg-white text-black rounded-lg"
        >
          cast
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
