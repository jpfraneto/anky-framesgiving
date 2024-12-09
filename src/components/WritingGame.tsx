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
import { Wand2, RefreshCw } from "lucide-react";

import ankyFramesgivingAbi from "../lib/ankyFramesgivingAbi.json";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SESSION_TIMEOUT = 8 * 60 * 1000; // 8 minutes

const ANKY_FRAMESGIVING_CONTRACT_ADDRESS =
  "0x699367a44d8ffc90e0cd07cbab218174d13f7e55";

type AnkyMetadata = {
  ticker: string;
  token_name: string;
  image_ipfs_hash: string;
  description: string;
  image_cloudinary_url: string;
};

export default function WritingGame() {
  console.log("INSIDE THE WRITING GAME");
  const [lastKeystrokeTimestamp, setLastKeystrokeTimestamp] = useState<
    number | null
  >(null);
  const [writingSessionEnded, setWritingSessionEnded] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
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

  // SDK state
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<FrameContext>();
  const [finalCastText, setFinalCastText] = useState<string | null>(null);
  const [processingCastText, setProcessingCastText] = useState(true);

  const prepareWritingSession = (() => {
    let hasRun = false;

    return async (userContext: FrameContext, userAddress: string) => {
      if (!userContext?.user || !userAddress) return;
      if (hasRun) return;

      hasRun = true;
      try {
        const response = await axios.get(
          `https://farcaster.anky.bot/framesgiving/prepare-writing-session?fid=${userContext.user.fid}&userWallet=${userAddress}`
        );

        const data = response.data;
        console.log("THE DATA IS");
        console.log("THE DATA IS");
        console.log("THE DATA IS");
        console.log("THE DATA IS");
        console.log(data);
        console.log("THE DATA IS");
        console.log("THE DATA IS");
        console.log("THE DATA IS");
        console.log("THE DATA IS");

        const parsedLongString = data.session_long_string.split("\n");
        // const fid = parsedLongString[0];
        const sessionId = parsedLongString[1];
        console.log("IN HERE<<<<< THE SESSION ID IS: ", sessionId);
        const thisSessionPrompt = parsedLongString[2];
        setPrompt(thisSessionPrompt);
        console.log("setting the session id", sessionId);
        setSessionId(sessionId);
      } catch (error) {
        console.error("Error preparing writing session:", error);
      }
    };
  })();

  const resetSession = useCallback(async () => {
    setResettingSession(true);
    console.log("THE RESET SESSION FUNCTION IS RUNNING NOW");
    setText("");
    setSessionActive(false);
    setTimeLeft(8000);
    setSessionLongString("");
    setWritingSessionEnded(false);
    setSessionStartTimestamp(new Date().getTime());
    if (keystrokeTimeoutRef.current) {
      clearTimeout(keystrokeTimeoutRef.current);
    }
    lastKeystrokeTimeRef.current = null;

    try {
      await prepareWritingSession(context!, address!);
      setResettingSession(false);
    } catch (error) {
      console.error("Error preparing session:", error);
      setPrompt("tell us who you are");
      setSessionId(crypto.randomUUID());
    }
  }, []);

  const startSession = async () => {
    setSessionActive(true);
    try {
      console.log("IN HERE<<<<< THE SESSION ID IS: ", sessionId);
      console.log("IN HERE<<<<< THE context ID IS: ", context);
      console.log("IN HERE<<<<< THE ADDRESS IS: ", address);
      if (!context?.user?.fid || !address || !sessionId) {
        throw new Error("Missing required session data");
      }

      console.log("Starting session", context, address, sessionId);

      const response = await axios.post(
        "https://farcaster.anky.bot/framesgiving/start-writing-session",
        {
          fid: context.user.fid,
          userWallet: address,
          idempotencyKey: crypto.randomUUID(),
          session_id: sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setTimeout(() => {
        toast.info("6 minutes remaining");
      }, 120000);
      setTimeout(() => {
        toast.info("4 minutes remaining");
      }, 240000);
      setTimeout(() => {
        toast.info("2 minutes remaining");
      }, 360000);
      setTimeout(() => {
        console.log("Triggering anky image request");
        sendAnkyImageRequest();
      }, 420000);

      // Handle successful response
      if (response.data) {
        // Do something with the response if needed
        return response.data;
      }
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start writing session");
      // Optionally reset session state or show error to user
      setSessionActive(false);
      throw error; // Re-throw if you want to handle it in the calling function
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
        url: `https://farcaster.anky.bot/framesgiving/generate-anky-image-from-session-long-string`,
        data: {
          session_long_string: sessionLongString,
          fid: context?.user.fid,
        },
        timeout: 70000, // 70 second timeout to account for the long processing time
      };
      const response = await axios.request(options);
      console.log("the response is: ", response.data);
      if (response.data) {
        setAnkyMetadata({
          ticker: response.data.ticker,
          token_name: response.data.token_name,
          image_ipfs_hash: response.data.image_ipfs_hash,
          description: response.data.reflection_to_user,
          image_cloudinary_url: response.data.image_cloudinary_url,
        });
        setAnkyMetadataRequestPending(false);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        console.error(
          "Request timed out - the image generation is taking longer than expected"
        );
      } else {
        console.error("Error sending anky image request:", error);
      }
      setAnkyMetadataRequestPending(false);
    }
  };

  const endWritingSession = async (
    sessionLongString: string,
    address: string
  ) => {
    try {
      const sessionData = extractSessionDataFromLongString(sessionLongString);
      if (sessionData.total_time_written < 480000) {
        setFinalCastText(text);
        setProcessingCastText(false);
        return;
      }
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
      setFinalCastText(response.data.new_cast_text);
      setProcessingCastText(false);
      return response.data;
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const deployAnky = async () => {
    if (!isFarcasterClient) {
      toast.error("Please access this from a Farcaster client");
      return;
    }

    try {
      if (!ankyMetadata?.image_ipfs_hash) {
        toast.error("No image IPFS hash found");
        return;
      }
      if (!ankyMetadata?.ticker) {
        toast.error("No ticker found");
        return;
      }
      if (!ankyMetadata?.token_name) {
        toast.error("No token name found");
        return;
      }

      toast.info(
        "Deploying your Anky. This is probably not ready yet but who knows what will happen...",
        {
          autoClose: false,
          toastId: "deploying",
        }
      );

      const responseFromContract = await writeContract({
        abi: ankyFramesgivingAbi,
        address: ANKY_FRAMESGIVING_CONTRACT_ADDRESS,
        functionName: "deployAnky",
        args: [
          ankyMetadata.image_ipfs_hash,
          ankyMetadata.ticker,
          ankyMetadata.token_name,
        ],
      });

      toast.dismiss("deploying");
      toast.success("Anky deployed successfully!");
      return responseFromContract;
    } catch (error) {
      toast.dismiss("deploying");
      toast.error("Failed to deploy Anky");
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

  if (resettingSession) {
    return <div>resetting session...</div>;
  }

  if (writingSessionEnded) {
    const elapsedTime = sessionStartTimestamp
      ? Date.now() - sessionStartTimestamp
      : 0;
    console.log(
      "RIGHT BEFORE RENDERING THE END SCREEN, the variables are: ",
      elapsedTime,
      sessionStartTimestamp,
      isFarcasterClient
    );
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
          finalCastText={finalCastText}
          processingCastText={processingCastText}
        />
      );
    }
  }

  return (
    <div className="flex flex-col w-full h-[380px]">
      <ToastContainer
        position="top-right"
        autoClose={1618}
        hideProgressBar={true}
        newestOnTop
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
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
        src={ankyMetadata.image_cloudinary_url}
        alt="anon"
        width={300}
        height={300}
      />
      <p className="text-white text-2xl">${ankyMetadata.ticker}</p>
      <p className="text-white text-3xl">{ankyMetadata.token_name}</p>
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
  finalCastText,
  processingCastText,
}: {
  sessionLongString: string;
  onReset: (context: FrameContext) => void;
  context: FrameContext;
  finalCastText: string | null;
  processingCastText: boolean;
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

      <SessionCompleteButtons
        onReset={onReset}
        context={context}
        finalCastText={finalCastText}
        processingCastText={processingCastText}
      />
    </div>
  );
}

function SessionCompleteButtons({
  onReset,
  context,
  finalCastText,
  processingCastText,
}: {
  onReset: (context: FrameContext) => void;
  context: FrameContext;
  finalCastText: string | null;
  processingCastText: boolean;
}) {
  const castWritingSession = async () => {
    if (!finalCastText) {
      toast.error("No cast text found");
      return;
    }
    sdk.actions.openUrl(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(finalCastText)}`
    );
  };

  return (
    <div className="w-full flex gap-4 items-center justify-center flex-col px-4 pb-8">
      <div className="w-full flex gap-4">
        <button
          onClick={castWritingSession}
          className={`w-full relative flex items-center justify-center gap-2 
            bg-purple-600 hover:bg-purple-700
            text-white font-semibold py-4 px-6 rounded-lg 
            transition-all duration-300 shadow-lg 
            hover:shadow-purple-500/30 disabled:opacity-75
            overflow-hidden`}
        >
          {processingCastText ? (
            <>
              <div className="absolute inset-0 bg-purple-700/20 animate-pulse" />
              <Wand2 className="w-6 h-6 animate-spin" />
              <span className="text-xl">processing</span>
            </>
          ) : (
            <>
              <Wand2 className="w-6 h-6" />
              <span className="text-xl">cast</span>
            </>
          )}
        </button>
      </div>

      <button
        onClick={() => {
          onReset(context);
          toast.info("preparing new writing session...");
        }}
        className="w-full flex items-center justify-center gap-2 
          bg-gray-700 hover:bg-gray-800 text-white font-semibold 
          py-4 px-6 rounded-lg transition-all duration-300 
          shadow-lg hover:shadow-gray-500/30 
          hover:scale-105 active:scale-95"
      >
        <RefreshCw className="w-6 h-6" />
        <span className="text-xl">start again</span>
      </button>
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

interface SessionData {
  user_id: string;
  session_id: string;
  prompt: string;
  starting_timestamp: number;
  session_text: string;
  total_time_written: number;
  word_count: number;
  average_wpm: number;
  flow_score: number;
}

export function extractSessionDataFromLongString(
  session_long_string: string
): SessionData {
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
