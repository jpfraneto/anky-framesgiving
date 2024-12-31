import { useEffect, useState, useRef, useCallback, ChangeEvent } from "react";
import sdk, { type FrameContext } from "@farcaster/frame-sdk";
import { useAccount } from "wagmi";
import { Rocket, RefreshCw, Wand2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import LifeBar from "./WritingGame/LifeBar";
import AnkyProgressBar from "./WritingGame/AnkyProgressBar";
import { extractSessionDataFromLongString } from "../lib/writing_game";

import axios from "axios";
import Image from "next/image";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAnky } from "~/context/AnkyContext";

// const ANKY_FRAMESGIVING_CONTRACT_ADDRESS =
//   "0xBc25EA092e9BEd151FD1947eE1Cf957cfdd580ef";

type AnkyMetadata = {
  ticker: string;
  token_name: string;
  image_ipfs_hash: string;
  description: string;
  image_cloudinary_url: string;
};

export type UserWritingStats = {
  currentStreak: number;
  maxStreak: number;
  daysInAnkyverse: number;
  totalSessions: number;
  sessions?: WritingSession[];
  ankyTokens?: WritingSession[];
  currentSessionId?: string;
};

export type WritingSession = {
  id: string;
  fid: number;
  startTime: string;
  endTime: string;
  ipfsHash: string;
  isAnky: boolean;
  isMinted: boolean;
  text: string;
};

export default function WritingGame() {
  const [lastKeystrokeTimestamp, setLastKeystrokeTimestamp] = useState<
    number | null
  >(null);
  const [writingSessionEnded, setWritingSessionEnded] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
  const [sessionLongString, setSessionLongString] = useState("");
  const [sessionIpfsHash, setSessionIpfsHash] = useState("");
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8000);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  // const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const [isAnkySession, setIsAnkySession] = useState(false);
  const [ankyMetadataRequestPending, setAnkyMetadataRequestPending] =
    useState(false);
  const [alreadyLoaded, setAlreadyLoaded] = useState(false);
  const [sessionStartTimestamp, setSessionStartTimestamp] = useState<
    number | null
  >(null);
  const [ankyMetadata, setAnkyMetadata] = useState<AnkyMetadata | null>(null);
  const [isDeployingAnky, setIsDeployingAnky] = useState(false);

  const { address } = useAccount();

  const lastKeystrokeTimeRef = useRef<number | null>(null);
  const keystrokeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sixMinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fourMinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const twoMinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // SDK state
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<FrameContext>();
  const [loading, setLoading] = useState(true);
  const [finalCastText, setFinalCastText] = useState<string | null>(null);
  const [processingCastText, setProcessingCastText] = useState(true);
  const [createPrompt, setCreatePrompt] = useState(false);

  const { setIsUserWriting, setUserWritingContext } = useAnky();
  const searchParams = useSearchParams();
  console.log("THE SEARCH PARAMS ARE: ", searchParams);
  const urlPrompt = searchParams.get("prompt");
  console.log("THE URL PROMPT IS: ", urlPrompt);

  const prepareWritingSession = useCallback(
    async (
      userContext: FrameContext,
      userAddress: string,
      finalPrompt: string
    ) => {
      if (!userContext?.user || !userAddress) return;

      try {
        const response = await axios.get(
          `https://farcaster.anky.bot/framesgiving/prepare-writing-session?fid=${userContext.user.fid}&userWallet=${userAddress}&prompt=${finalPrompt}`
        );

        const data = response.data;
        setUserWritingContext(data.userWritingStats);
        setSessionLongString(data.session_long_string);

        const parsedLongString = data.session_long_string.split("\n");
        const sessionId = parsedLongString[1];
        const thisSessionPrompt = parsedLongString[2];

        setPrompt(thisSessionPrompt);
        setSessionId(sessionId);
      } catch (error) {
        console.error("Error preparing writing session:", error);
      }
    },
    [] // Empty dependency array since it doesn't use any external values
  );

  const resetSession = useCallback(async () => {
    setResettingSession(true);
    console.log("THE RESET SESSION FUNCTION IS RUNNING NOW");
    setText("");
    setSessionActive(false);
    setTimeLeft(0);
    setSessionLongString("");
    setWritingSessionEnded(false);
    setSessionStartTimestamp(null);

    if (keystrokeTimeoutRef.current) {
      clearTimeout(keystrokeTimeoutRef.current);
    }
    lastKeystrokeTimeRef.current = null;

    try {
      await prepareWritingSession(context!, address!, "");
      setResettingSession(false);
    } catch (error) {
      console.error("Error preparing session:", error);
      setPrompt("tell us who you are");
      setSessionId(crypto.randomUUID());
    }
  }, [context, address, prepareWritingSession]);

  const startSession = async () => {
    setSessionActive(true);
    setIsUserWriting(true);
    try {
      console.log("IN HERE<<<<< THE SESSION ID IS: ", sessionId);
      console.log("IN HERE<<<<< THE context ID IS: ", context);
      console.log("IN HERE<<<<< THE ADDRESS IS: ", address);
      if (!context?.user?.fid || !address || !sessionId) {
        throw new Error("Missing required session data");
      }

      console.log("Starting session", context, address, sessionId);

      const newIdempotencyKey = crypto.randomUUID();
      setIdempotencyKey(newIdempotencyKey);

      const response = await axios.post(
        "https://farcaster.anky.bot/framesgiving/start-writing-session",
        {
          fid: context.user.fid,
          userWallet: address,
          idempotencyKey: newIdempotencyKey,
          session_id: sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("THE WRITING SESSION WAS STARTED");
      if (response.data.success) {
        setSessionStartTimestamp(new Date().getTime());
        sixMinTimeoutRef.current = setTimeout(() => {
          toast.info("6 minutes remaining");
        }, 120000);
        fourMinTimeoutRef.current = setTimeout(() => {
          toast.info("4 minutes remaining");
        }, 240000);
        twoMinTimeoutRef.current = setTimeout(() => {
          toast.info("2 minutes remaining");
        }, 360000);
        // Store timeouts so they can be cleared when session ends
      } else {
        console.log("the session was not started successfully");
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
      // Early return if already loaded or missing dependencies
      if (!sdk || alreadyLoaded || isSDKLoaded || !address) return;

      try {
        setAlreadyLoaded(true);
        setIsSDKLoaded(true);

        const frameContext = await sdk.context;
        setContext(frameContext);

        let finalPrompt = "";
        if (frameContext?.location?.type === "cast_embed") {
          try {
            const embedUrl = frameContext.location.embed;
            const url = new URL(embedUrl);
            const promptParam = url.searchParams.get("prompt");
            if (promptParam) {
              finalPrompt = promptParam
                .split("+")
                .map((part) => decodeURIComponent(part))
                .join(" ");
            }
          } catch (error) {
            console.error("Error parsing embed URL:", error);
          }
        }

        if (frameContext && address) {
          await prepareWritingSession(frameContext, address, finalPrompt);
        }

        setLoading(false);
        sdk.actions.ready({});
      } catch (error) {
        console.error("Error in frame initialization:", error);
        setPrompt("tell us who you are");
        setSessionId(crypto.randomUUID());
        sdk.actions.ready({});
      }
    };

    load();
  }, [sdk, address, alreadyLoaded, isSDKLoaded]);

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

  const endWritingSession = async (
    sessionLongString: string,
    address: string
  ) => {
    try {
      clearTimeoutRefs();
      console.log("ENDING THE WRITING SESSIon");
      console.log("the session long string is: ", sessionLongString);
      console.log("the address is: ", address);
      console.log("the fid is: ", context?.user.fid);
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
      setSessionIpfsHash(response.data.ipfs_hash);
      setFinalCastText(text);
      setProcessingCastText(false);
      const elapsedTime = sessionStartTimestamp
        ? Date.now() - sessionStartTimestamp
        : 0;

      if (elapsedTime < 479999) {
        setIsUserWriting(false);
      }

      return response.data;
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const sendAnkyImageRequest = async () => {
    try {
      if (ankyMetadataRequestPending || ankyMetadata?.token_name) return;
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
          idempotency_key: idempotencyKey,
        },
        timeout: 88888, // 88 second timeout to account for the long processing time
      };
      const response = await axios.request(options);
      console.log("the response is: ", response.data);
      if (response.data) {
        setAnkyMetadata({
          ticker: response.data.ticker,
          token_name: response.data.token_name,
          image_ipfs_hash: response.data.image_ipfs_hash,
          description: response.data.reflection_to_user,
          image_cloudinary_url:
            response.data?.image_cloudinary_url ||
            "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true",
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

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const currentTime = Date.now();
      const newValue = e.target.value;

      if (!sessionActive) {
        startSession();
      }

      if (keystrokeTimeoutRef.current) {
        clearTimeout(keystrokeTimeoutRef.current);
      }

      setLastKeystrokeTimestamp(currentTime);
      setTimeLeft(8000);

      const timeDelta =
        currentTime - (lastKeystrokeTimeRef.current ?? currentTime);
      const timeStr = (timeDelta / 1000).toFixed(3);

      if (newValue.length < text.length) {
        setSessionLongString((prev) => prev + "\nBackspace " + timeStr);
      } else if (newValue.length > text.length) {
        const newChars = newValue.slice(text.length);
        const keystrokes = newChars
          .split("")
          .map((char) => {
            if (char === "\n") return "Enter " + timeStr;
            if (char === " ") return " " + timeStr;
            return char + " " + timeStr;
          })
          .join("\n");
        setSessionLongString((prev) => prev + "\n" + keystrokes);
      }

      setText(newValue);
      lastKeystrokeTimeRef.current = currentTime;

      const timeout = setTimeout(() => {
        setWritingSessionEnded(true);
        const elapsedTime = sessionStartTimestamp
          ? Date.now() - sessionStartTimestamp
          : 0;
        if (elapsedTime >= 8 * 60 * 1000) {
          setIsAnkySession(true);
        }
        if (address) {
          endWritingSession(sessionLongString, address);
          const sessionData =
            extractSessionDataFromLongString(sessionLongString);
          if (
            new Date().getTime() - sessionStartTimestamp! > 479999 ||
            sessionData.total_time_written > 479999
          ) {
            sendAnkyImageRequest();
          }
        }
      }, 8000);

      keystrokeTimeoutRef.current = timeout;
    },
    [
      sessionActive,
      text,
      address,
      sessionLongString,
      sessionStartTimestamp,
      startSession,
      endWritingSession,
      sendAnkyImageRequest,
    ]
  );

  const clearTimeoutRefs = () => {
    if (sixMinTimeoutRef.current) clearTimeout(sixMinTimeoutRef.current);
    if (fourMinTimeoutRef.current) clearTimeout(fourMinTimeoutRef.current);
    if (twoMinTimeoutRef.current) clearTimeout(twoMinTimeoutRef.current);
  };

  const deployAnky = async (): Promise<string | undefined> => {
    console.log("going to deploy the anky now");
    setIsDeployingAnky(true);
    console.log("the anky metadata is: ", ankyMetadata);

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

      // Check if all required variables are set
      if (!sessionIpfsHash) {
        toast.error("No session IPFS hash found");
        return;
      }
      if (!ankyMetadata.image_cloudinary_url) {
        toast.error("No image URL found");
        return;
      }
      if (!address) {
        toast.error("No writer address found");
        return;
      }
      if (!sessionId) {
        toast.error("No session ID found");
        return;
      }
      if (!context?.user.fid) {
        toast.error("No writer FID found");
        return;
      }

      const response = await axios.post(
        "https://farcaster.anky.bot/framesgiving/deploy-anky",
        {
          writing_session_ipfs_hash: sessionIpfsHash,
          image_url: ankyMetadata.image_cloudinary_url,
          ticker: ankyMetadata.ticker,
          token_name: ankyMetadata.token_name,
          description: ankyMetadata.description,
          writer_address: address,
          session_id: sessionId,
          image_ipfs_hash: ankyMetadata.image_ipfs_hash,
          writer_fid: context?.user.fid,
        }
      );
      console.log("the response from the deploy anky is: ", response.data);
      setIsUserWriting(false);
      return response.data.cast_hash;
    } catch (error) {
      toast.dismiss("deploying");
      toast.error("Failed to deploy Anky");
      console.error("Error deploying Anky:", error);
    }
  };

  if (resettingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (writingSessionEnded) {
    return (
      <SessionCompleteScreen
        ankyMetadataRequestPending={ankyMetadataRequestPending}
        setAnkyMetadataRequestPending={setAnkyMetadataRequestPending}
        sessionLongString={sessionLongString}
        onReset={resetSession}
        context={context!}
        finalCastText={finalCastText}
        processingCastText={processingCastText}
        deployAnky={deployAnky}
        ankyMetadata={ankyMetadata!}
        setAnkyMetadata={setAnkyMetadata}
        isDeployingAnky={isDeployingAnky}
        setIsDeployingAnky={setIsDeployingAnky}
        isAnkySession={isAnkySession}
      />
    );
  }

  return (
    <div className="flex flex-col w-full h-full p-4 bg-purple-900 relative">
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
      {!createPrompt && (
        <div className="absolute top-2 right-4 flex flex-row gap-2">
          <button
            onClick={() => {
              setCreatePrompt(!createPrompt);
            }}
            className={`
            relative flex items-center justify-center
            w-10 h-10 rounded-lg transition-all duration-300
            ${
              createPrompt
                ? "bg-purple-600 shadow-lg shadow-purple-500/30"
                : "bg-white/10 backdrop-blur-sm hover:bg-white/20"
            }
          `}
            title="Toggle prompt creation"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className={`w-6 h-6 transition-transform duration-300 ${
                createPrompt ? "rotate-180 scale-110" : ""
              }`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  createPrompt
                    ? "M19 9l-7 7-7-7"
                    : "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                }
              />
            </svg>
          </button>
        </div>
      )}
      <AnkyProgressBar sessionStartTime={sessionStartTimestamp} />
      <LifeBar timeLeft={timeLeft} />
      <WritingComponent
        text={text}
        prompt={prompt}
        handleTextChange={handleTextChange}
        loading={loading}
        createPrompt={createPrompt}
      />
    </div>
  );
}

function WritingComponent({
  text,
  prompt,
  handleTextChange,
  loading,
  createPrompt,
}: {
  text: string;
  prompt: string;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
  createPrompt: boolean;
}) {
  const [streamedPrompt, setStreamedPrompt] = useState("");
  const [createPromptText, setCreatePromptText] = useState("");
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

  async function handleCreatePromptTextChange(
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    console.log("the create prompt text is: ", e.target.value);
    setCreatePromptText(e.target.value);
  }

  const handleCreateFrame = () => {
    // 1) Show the raw user input
    console.log("Starting prompt:", createPromptText);

    // 2) Replace spaces with plus (+) signs
    //    e.g. "this is the starting point" -> "this+is+the+starting+point"
    const plusEncodedPrompt = createPromptText.replace(/\s/g, "+");
    console.log("plusEncodedPrompt:", plusEncodedPrompt);

    // 3) Single-encode that plus-encoded prompt
    //    e.g. "this+is+the+starting+point" -> "this%2Bis%2Bthe%2Bstarting%2Bpoint"
    const singleEncodedPrompt = encodeURIComponent(plusEncodedPrompt);
    console.log("singleEncodedPrompt:", singleEncodedPrompt);

    // 4) Build the raw frame URL, inserting the single-encoded prompt
    //    e.g. "https://framesgiving.anky.bot?prompt=this%2Bis%2Bthe%2Bstarting%2Bpoint"
    const rawFrameUrl = `https://framesgiving.anky.bot?prompt=${singleEncodedPrompt}`;
    console.log("rawFrameUrl:", rawFrameUrl);

    // 5) Double-encode the entire URL
    //    e.g. "https%3A%2F%2Fframesgiving.anky.bot%3Fprompt%3Dthis%252Bis%252Bthe%252Bstarting%252Bpoint"
    const doubleEncodedFrameUrl = encodeURIComponent(rawFrameUrl);
    console.log("doubleEncodedFrameUrl:", doubleEncodedFrameUrl);

    // 6) Construct the final Warpcast composer link
    //    text= gets single-encoded, but framesgiving URL is double-encoded
    const finalComposerUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
      createPromptText
    )}&embeds[]=${doubleEncodedFrameUrl}`;
    console.log("finalComposerUrl:", finalComposerUrl);

    // 7) (Optional) Test decoding to verify
    try {
      const testUrl = new URL(decodeURIComponent(doubleEncodedFrameUrl));
      const testPrompt = testUrl.searchParams.get("prompt");
      console.log(
        "Test decode of prompt:",
        decodeURIComponent(testPrompt || "")
      );
    } catch (err) {
      console.error("Decode test failed:", err);
    }

    // 8) Copy to clipboard and open the Warpcast composer
    navigator.clipboard.writeText(finalComposerUrl);
    sdk.actions.openUrl(finalComposerUrl);
  };

  if (createPrompt) {
    return (
      <div className="relative">
        <textarea
          className="w-full rounded-xl h-48 sm:h-96 p-6 text-gray-300 bg-gray-900 
            placeholder:text-gray-500 text-lg sm:text-xl md:text-2xl resize-none outline-none
            border-2 border-gray-800 focus:border-purple-500 transition-colors"
          placeholder="what do you want to ask farcaster?"
          autoCorrect="off"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          value={createPromptText}
          onChange={handleCreatePromptTextChange}
        />
        <button
          onClick={handleCreateFrame}
          className="absolute left-1/2 -translate-x-1/2 -bottom-16 w-64 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
    transition-colors font-medium text-lg"
        >
          ask through anky
        </button>
      </div>
    );
  }

  return (
    <textarea
      className="w-full rounded-xl h-96 sm:h-full p-4 text-gray-300 bg-black placeholder:text-gray-400 text-lg sm:text-xl md:text-2xl resize-none outline-none"
      placeholder={loading ? "..." : streamedPrompt}
      autoCorrect="off"
      autoComplete="off"
      autoCapitalize="off"
      spellCheck="false"
      value={text}
      onChange={handleTextChange}
    />
  );
}

function SessionCompleteScreen({
  sessionLongString,
  onReset,
  context,
  finalCastText,
  processingCastText,
  deployAnky,
  ankyMetadata,
  setAnkyMetadata,
  isDeployingAnky,
  setIsDeployingAnky,
  setAnkyMetadataRequestPending,
  ankyMetadataRequestPending,
  isAnkySession,
}: {
  sessionLongString: string;
  onReset: (context: FrameContext) => void;
  context: FrameContext;
  finalCastText: string | null;
  processingCastText: boolean;
  ankyMetadataRequestPending: boolean;
  setAnkyMetadataRequestPending: (ankyMetadataRequestPending: boolean) => void;
  deployAnky?: () => Promise<string | undefined>;
  ankyMetadata?: AnkyMetadata;
  setAnkyMetadata: (ankyMetadata: AnkyMetadata) => void;
  isDeployingAnky?: boolean;
  setIsDeployingAnky?: (isDeployingAnky: boolean) => void;
  isAnkySession: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [displayedChars, setDisplayedChars] = useState("");
  const [generatingAnkyFallback, setGeneratingAnkyFallback] = useState(false);
  const [deployedAnkyCastHash, setDeployedAnkyCastHash] = useState("");
  const sessionData = extractSessionDataFromLongString(sessionLongString);
  const [revealAnkyMetadata, setRevealAnkyMetadata] = useState(false);
  const prompt = sessionLongString.split("\n")[3];

  useEffect(() => {
    const startTime = new Date().getTime();
    const duration = 88000; // 88 seconds
    const containerRef = document.querySelector(".animate-float");

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - Number(startTime);
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);

    // Parse the typing data
    const typingData = sessionLongString
      .split("\n")
      .slice(4)
      .map((line) => {
        const leadingSpaces = line.match(/^\s*/)?.[0]?.length ?? 0;
        if (leadingSpaces > 0) {
          return { char: " ", interval: parseFloat(line.trim()) * 100 };
        }

        const [char, timeStr] = line.split(/\s+/);
        if (!char || !timeStr) return null;

        if (char === "Enter")
          return { char: "\n", interval: parseFloat(timeStr) * 100 };
        if (char === "Backspace")
          return { char: "BACKSPACE", interval: parseFloat(timeStr) * 100 };
        return { char, interval: parseFloat(timeStr) * 100 };
      })
      .filter(Boolean);

    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;
    let currentText = "";

    const streamNextChar = () => {
      if (currentIndex >= typingData.length) return;

      const currentData = typingData[currentIndex];
      if (!currentData) return;

      const { char, interval } = currentData;

      if (char === "BACKSPACE") {
        currentText = currentText.slice(0, -1);
      } else {
        currentText += char;
      }

      setDisplayedChars(currentText);
      currentIndex++;

      if (containerRef) {
        const isScrolledToBottom =
          containerRef.scrollHeight - containerRef.scrollTop ===
          containerRef.clientHeight;
        if (isScrolledToBottom) {
          containerRef.scrollTop = 0;
        }
      }

      if (currentIndex < typingData.length) {
        timeoutId = setTimeout(streamNextChar, interval);
      }
    };

    streamNextChar();

    return () => {
      clearInterval(progressInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionLongString]);

  if (revealAnkyMetadata) {
    return (
      <div className="bg-purple-500 p-4 rounded-lg flex flex-col items-center gap-4">
        <div className="relative flex flex-col items-center justify-center rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 animate-pulse blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-transparent to-purple-500/20 animate-spin-slow blur-lg" />
          <div className="relative rounded-lg overflow-hidden border-4 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.4)] animate-fadeIn">
            <Image
              src={
                ankyMetadata?.image_cloudinary_url ||
                "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true"
              }
              alt="anon"
              width={300}
              height={300}
              className="animate-scaleIn"
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center mt-6 space-y-4">
          <p className="text-white text-4xl font-bold tracking-wider animate-pulse-scale">
            ${ankyMetadata?.ticker || "something went wrong"}
          </p>
          <p className="text-white/90 text-xl italic text-center max-w-md leading-relaxed bg-white/10 px-6 py-3 rounded-lg backdrop-blur-sm">
            {ankyMetadata?.token_name || "something went wrong"}
          </p>
        </div>

        {deployedAnkyCastHash ? (
          <button
            onClick={() =>
              sdk.actions.openUrl(
                `https://warpcast.com/~/conversations/${deployedAnkyCastHash}`
              )
            }
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl"
          >
            Open Deployment Cast
          </button>
        ) : (
          <button
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:rotate-1 shadow-lg hover:shadow-purple-500/50 active:scale-95 w-48 relative overflow-hidden"
            onClick={async () => {
              if (setIsDeployingAnky && deployAnky) {
                setIsDeployingAnky(true);
                const castHash = await deployAnky();
                setIsDeployingAnky(false);
                if (castHash) {
                  setDeployedAnkyCastHash(castHash);
                }
              }
            }}
            disabled={isDeployingAnky}
          >
            {isDeployingAnky ? (
              <div className="flex items-center justify-center gap-2 w-full">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Deploying...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 w-full">
                <Rocket className="w-5 h-5 animate-bounce" />
                <span>Deploy via Clanker</span>
              </div>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-around h-full bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 px-8 pt-8">
      <div className="w-full items-center mb-2">
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

      <div className="text-white text-2xl font-bold mb-4 italic">{prompt}</div>

      <div className="w-full bg-black/30 h-64 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-white/10 overflow-hidden mb-8">
        <div className="h-64 overflow-hidden mb-4 h-full font-mono text-sm w-full">
          <div className="animate-float wrap h-64 w-full overflow-y-scroll text-white">
            {displayedChars}
          </div>
        </div>
      </div>

      {isAnkySession ? (
        <div className="w-full flex flex-col items-center gap-4">
          <button
            onClick={async () => {
              if (ankyMetadata) {
                setRevealAnkyMetadata(true);
                return;
              }
              setGeneratingAnkyFallback(true);
              setAnkyMetadataRequestPending(true);
              const response = await axios.post(
                `https://farcaster.anky.bot/framesgiving/generate-anky-image-from-session-long-string`,
                {
                  session_long_string: sessionLongString,
                  fid: context?.user.fid,
                }
              );
              if (response.data) {
                setAnkyMetadata({
                  ticker: response.data.ticker,
                  token_name: response.data.token_name,
                  image_ipfs_hash: response.data.image_ipfs_hash,
                  description: response.data.reflection_to_user,
                  image_cloudinary_url:
                    response.data?.image_cloudinary_url ||
                    "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true",
                });
              }
              setGeneratingAnkyFallback(false);
              setAnkyMetadataRequestPending(false);
            }}
            className={`w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg font-bold text-lg transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 ${
              generatingAnkyFallback ? "animate-pulse hover:animate-none" : ""
            } ${
              progress > 0
                ? `animate-[spin_${progress / 10}s_linear_infinite]`
                : ""
            }`}
            disabled={ankyMetadataRequestPending}
          >
            {ankyMetadata
              ? "Reveal Anky"
              : ankyMetadataRequestPending
              ? "Generating Anky..."
              : "Generate My Anky"}
          </button>

          {generatingAnkyFallback && (
            <div className="w-full">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-[88000ms] ease-linear"
                  style={{
                    width: "100%",
                    transform: "translateX(-100%)",
                    animation: "fillProgress 88s linear forwards",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <SessionCompleteButtons
          onReset={onReset}
          context={context}
          finalCastText={finalCastText}
          processingCastText={processingCastText}
        />
      )}
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
    <div className="w-full flex gap-4 items-center justify-center  mb-auto flex-col px-4 pb-8">
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

export interface SessionData {
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

// function WritingSessionChart({
//   sessionLongString,
// }: {
//   sessionLongString: string;
// }) {
//   const parsedData = useMemo(() => {
//     const lines = sessionLongString.split("\n").slice(3);
//     const intervals: number[] = [];

//     lines.forEach((line) => {
//       if (!line.trim()) return;
//       const [, timeStr] = line.split(/\s+/);
//       const interval = parseFloat(timeStr);
//       if (!isNaN(interval)) {
//         intervals.push(interval);
//       }
//     });

//     const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
//     const max = Math.max(...intervals);

//     return {
//       intervals,
//       average,
//       max,
//     };
//   }, [sessionLongString]);

//   return (
//     <div className="w-full max-w-2xl mx-auto bg-[#1E2B3D] p-4 rounded-lg">
//       <div className="relative h-40">
//         {/* Average line */}
//         <div
//           className="absolute w-full border-t-2 border-dashed border-yellow-300"
//           style={{
//             top: `${100 - (parsedData.average / parsedData.max) * 100}%`,
//           }}
//         />

//         {/* Interval bars */}
//         <div className="flex items-end h-full gap-[1px]">
//           {parsedData.intervals.map((interval, i) => (
//             <div
//               key={i}
//               className="flex-1 bg-[rgb(134,255,244)] bg-opacity-20"
//               style={{
//                 height: `${(interval / parsedData.max) * 100}%`,
//               }}
//             />
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }
