import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  ChangeEvent,
} from "react";
import sdk, { type FrameContext } from "@farcaster/frame-sdk";
import { useAccount } from "wagmi";
import { Rocket, RefreshCw, Wand2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { extractSessionDataFromLongString } from "../lib/writing_game";

import axios from "axios";
import Image from "next/image";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAnky } from "~/context/AnkyContext";

const SESSION_TIMEOUT = 8 * 60 * 1000; // 8 minutes

// const ANKY_FRAMESGIVING_CONTRACT_ADDRESS =
//   "0xBc25EA092e9BEd151FD1947eE1Cf957cfdd580ef";

type AnkyMetadata = {
  ticker: string;
  token_name: string;
  image_ipfs_hash: string;
  description: string;
  image_cloudinary_url: string;
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
  const [prompt, setPrompt] = useState("tell me who you are");
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8000);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

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

  const [addFrameResult, setAddFrameResult] = useState("");

  const { setIsUserWriting } = useAnky();
  const searchParams = useSearchParams();
  const urlPrompt = searchParams.get("prompt");

  const prepareWritingSession = (() => {
    let hasRun = false;

    return async (userContext: FrameContext, userAddress: string) => {
      if (!userContext?.user || !userAddress) return;
      if (hasRun) return;

      hasRun = true;
      try {
        console.log("the url prompt is: ", urlPrompt);
        const response = await axios.get(
          `https://farcaster.anky.bot/framesgiving/prepare-writing-session?fid=${userContext.user.fid}&userWallet=${userAddress}&prompt=${urlPrompt}`
        );

        const data = response.data;
        console.log(
          "setting up the data session long string",
          data.session_long_string
        );

        setSessionLongString(data.session_long_string);

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
    setTimeLeft(0);
    setSessionLongString("");
    setWritingSessionEnded(false);
    setSessionStartTimestamp(null);

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
      console.log("Starting load function");
      console.log("Initial conditions:", { alreadyLoaded, sdk, isSDKLoaded });
      console.log("HEEEEREEEEEE", urlPrompt);
      if (urlPrompt) {
        setPrompt(decodeURIComponent(urlPrompt));
      }

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
        setLoading(false);

        sdk.actions.ready({});
        console.log("Called sdk.actions.ready()");
      } catch (error) {
        console.log("Error in load function:", error);
        setPrompt("tell us who you are");
        setSessionId(crypto.randomUUID());
        sdk.actions.ready({});
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

        // if (elapsed >= 360000) {
        //   // 6 minutes = 360000 milliseconds
        //   console.log("inside the elapsed, sending the anky image request");
        //   sendAnkyImageRequest();
        // }

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
    console.log("Handling text change", e.target.value);
    const currentTime = Date.now();
    const newValue = e.target.value;

    if (!sessionActive) {
      console.log("Starting new session");
      startSession();
    }

    if (keystrokeTimeoutRef.current) {
      console.log("Clearing existing keystroke timeout");
      clearTimeout(keystrokeTimeoutRef.current);
    }

    console.log("Updating timestamps and text");
    setLastKeystrokeTimestamp(currentTime);
    setTimeLeft(8000);

    // Calculate time delta
    const timeDelta =
      currentTime - (lastKeystrokeTimeRef.current ?? currentTime);
    const timeStr = (timeDelta / 1000).toFixed(3);

    // Detect what changed between previous text and new text
    if (newValue.length < text.length) {
      // Backspace was pressed
      setSessionLongString((prev) => prev + "\nBackspace " + timeStr);
    } else if (newValue.length > text.length) {
      // New character(s) added
      const newChars = newValue.slice(text.length);
      // Build up all keystroke data before updating state
      const keystrokes = newChars.split("").map((char) => {
        if (char === "\n") return "Enter " + timeStr;
        if (char === " ") return " " + timeStr;
        return char + " " + timeStr;
      });
      // Add all keystrokes to session string
      setSessionLongString((prev) => prev + "\n" + keystrokes.join("\n"));
    }

    setText(newValue);
    lastKeystrokeTimeRef.current = currentTime;

    const timeout = setTimeout(() => {
      console.log("Session timeout reached");
      setWritingSessionEnded(true);
      if (address) {
        console.log("Sending session to server");
        endWritingSession(sessionLongString, address);
        const sessionData = extractSessionDataFromLongString(sessionLongString);
        if (sessionData.total_time_written > 479999) {
          sendAnkyImageRequest();
        }
      }
    }, 8000);

    keystrokeTimeoutRef.current = timeout;
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

  const clearTimeoutRefs = () => {
    if (sixMinTimeoutRef.current) clearTimeout(sixMinTimeoutRef.current);
    if (fourMinTimeoutRef.current) clearTimeout(fourMinTimeoutRef.current);
    if (twoMinTimeoutRef.current) clearTimeout(twoMinTimeoutRef.current);
  };

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

  const addFrame = useCallback(async () => {
    console.log("Adding frame...");
    setIsSavingNotifications(true);
    try {
      console.log("Calling sdk.actions.addFrame()...");
      const result = await sdk.actions.addFrame();
      console.log("addFrame result:", result);

      if (result.added) {
        console.log("Frame was added successfully");
        if (result.notificationDetails) {
          console.log("Got notification details:", result.notificationDetails);
        }
        setAddFrameResult(result.notificationDetails ? `Success` : "Success");

        if (result.notificationDetails && context?.user.fid) {
          try {
            const response = await fetch(
              "https://farcaster.anky.bot/framesgiving/set-notification-details",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  fid: context.user.fid,
                  notificationDetails: {
                    token: result.notificationDetails.token,
                    url: result.notificationDetails.url,
                    targetUrl: window.location.href,
                  },
                }),
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Notification details saved:", data);
          } catch (error) {
            console.error("Error saving notification details:", error);
            toast.error("Failed to save notification settings");
          }
        }
      } else {
        console.log("Frame was not added. Reason:", result.reason);
        setAddFrameResult(`Not added: ${result.reason}`);
      }
    } catch (error) {
      console.error("Error adding frame:", error);
      setAddFrameResult(`Error: ${error}`);
    } finally {
      setIsSavingNotifications(false);
    }
  }, [context]);

  // if (!address)
  //   return (
  //     <div className="flex flex-col items-center justify-center h-full text-white text-2xl p-4">
  //       <p>you need to access this frame from inside a farcaster client</p>
  //       <div className="flex items-center justify-center p-2 bg-white rounded-lg mt-4">
  //         <Link href="https://warpcast.com" className="shadow-lg shadow-white">
  //           <Image
  //             src="https://warpcast.com/og-logo.png"
  //             alt="warpcast logo"
  //             width={100}
  //             height={100}
  //           />
  //         </Link>
  //       </div>
  //     </div>
  //   );

  if (resettingSession) {
    return <div>resetting session...</div>;
  }

  if (writingSessionEnded) {
    const elapsedTime = sessionStartTimestamp
      ? Date.now() - sessionStartTimestamp
      : 0;
    if (elapsedTime >= SESSION_TIMEOUT) {
      return (
        <UserWonTheGame
          sessionLongString={sessionLongString}
          context={context!}
          setAnkyMetadata={setAnkyMetadata}
          ankyMetadata={ankyMetadata!}
          deployAnky={deployAnky}
          ankyMetadataRequestPending={ankyMetadataRequestPending}
          isDeployingAnky={isDeployingAnky}
          setIsDeployingAnky={setIsDeployingAnky}
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
          addFrame={addFrame}
          addFrameResult={addFrameResult}
          isSavingNotifications={isSavingNotifications}
        />
      );
    }
  }

  return (
    <div className="flex flex-col w-full h-full">
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
      <AnkyProgressBar sessionStartTime={sessionStartTimestamp} />
      <LifeBar timeLeft={timeLeft} />
      <WritingComponent
        text={text}
        prompt={prompt}
        handleTextChange={handleTextChange}
        loading={loading}
      />
    </div>
  );
}

function UserWonTheGame({
  deployAnky,
  ankyMetadata,
  setAnkyMetadata,
  ankyMetadataRequestPending,
  sessionLongString,
  context,
  isDeployingAnky,
  setIsDeployingAnky,
}: {
  deployAnky: () => Promise<string | undefined>;
  ankyMetadata: AnkyMetadata;
  setAnkyMetadata: (ankyMetadata: AnkyMetadata) => void;
  ankyMetadataRequestPending: boolean;
  sessionLongString: string;
  context: FrameContext;
  isDeployingAnky: boolean;
  setIsDeployingAnky: (isDeployingAnky: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [displayedChars, setDisplayedChars] = useState("");
  const [generatingAnkyFallback, setGeneratingAnkyFallback] = useState(false);
  const [deployedAnkyCastHash, setDeployedAnkyCastHash] = useState("");

  const session_data = extractSessionDataFromLongString(sessionLongString);

  useEffect(() => {
    const startTime = sessionLongString.split("\n")[3];
    const duration = 88000; // 88 seconds

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
      .slice(4) // Start after the metadata lines
      .map((line) => {
        const leadingSpaces = line.match(/^\s*/)?.[0]?.length ?? 0;
        if (leadingSpaces > 0) {
          return {
            char: " ",
            interval: parseFloat(line.trim()) * 100, // Convert to ms and speed up 10x
          };
        }

        const [char, timeStr] = line.split(/\s+/);
        if (!char || !timeStr) return null;

        if (char === "Enter") {
          return {
            char: "\n",
            interval: parseFloat(timeStr) * 100,
          };
        }

        if (char === "Backspace") {
          return {
            char: "BACKSPACE",
            interval: parseFloat(timeStr) * 100,
          };
        }

        return {
          char: char,
          interval: parseFloat(timeStr) * 100,
        };
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

  if (ankyMetadataRequestPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center text-white space-y-8">
        <h2 className="text-3xl font-bold text-center mb-8">
          Congratulations on completing your writing session! 🎉
        </h2>
        <small>
          your flow score was {Math.round(session_data?.flow_score || 0)}%
        </small>

        <div className="w-full bg-black/30 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-white/10 overflow-hidden ">
          <div className="h-48 overflow-hidden mb-4 font-mono text-sm w-full">
            <div className="animate-float wrap w-full overflow-y-scroll">
              {displayedChars}
            </div>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-4 mt-4">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-center mt-4">
            Your anky is being generated... {Math.round(progress)}%
          </p>
        </div>
      </div>
    );
  }
  if (!ankyMetadata) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center text-white space-y-8">
        <div className="max-w-md w-full bg-black/30 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-white/10">
          <div className="space-y-4 text-lg">
            <p className="leading-relaxed">
              There was an error generating your anky. Please try again.
            </p>

            <div className="pl-4 space-y-3">
              <p className="flex items-start">
                <span className="text-pink-400 mr-2">
                  (the process takes about 88 seconds. please be patient)
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              setGeneratingAnkyFallback(true);
              const response = await axios.post(
                `https://farcaster.anky.bot/framesgiving/generate-anky-image-from-session-long-string`,
                {
                  session_long_string: sessionLongString,
                  fid: context?.user.fid,
                }
              );
              console.log(
                "the response from asking for the anky is: ",
                response.data
              );
              setAnkyMetadata({
                ticker: response.data.ticker,
                token_name: response.data.token_name,
                image_ipfs_hash: response.data.image_ipfs_hash,
                description: response.data.reflection_to_user,
                image_cloudinary_url:
                  response.data?.image_cloudinary_url ||
                  "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true",
              });
              setGeneratingAnkyFallback(false);
            }}
            className={`mt-8 w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg font-bold text-lg transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 ${
              generatingAnkyFallback ? "animate-pulse hover:animate-none" : ""
            }`}
          >
            {generatingAnkyFallback ? "Generating Anky..." : "Generate My Anky"}
          </button>
          {generatingAnkyFallback && (
            <div className="w-full mt-4">
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
              <style jsx>{`
                @keyframes fillProgress {
                  from {
                    transform: translateX(-100%);
                  }
                  to {
                    transform: translateX(0);
                  }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-purple-500 p-4 rounded-lg flex flex-col items-center gap-4 h-full">
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
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(1.2);
            filter: blur(10px);
          }
          to {
            transform: scale(1);
            filter: blur(0);
          }
        }
        @keyframes pulse-scale {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 1.5s ease-out forwards;
        }
        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }
      `}</style>

      {deployedAnkyCastHash ? (
        <button
          onClick={() =>
            sdk.actions.openUrl(
              `https://warpcast.com/~/conversations/${deployedAnkyCastHash}`
            )
          }
        >
          open deployment cast
        </button>
      ) : (
        <button
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:rotate-1 shadow-lg hover:shadow-purple-500/50 active:scale-95 w-48 relative overflow-hidden"
          onClick={async () => {
            setIsDeployingAnky(true);
            const castHash = await deployAnky();
            setIsDeployingAnky(false);
            if (castHash) {
              setDeployedAnkyCastHash(castHash);
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

function LifeBar({ timeLeft }: { timeLeft: number }) {
  return (
    <div
      className="h-2 bg-blue-500 transition-all duration-500 ease-in-out"
      style={{
        width: `${(timeLeft / 8000) * 100}%`,
        opacity: timeLeft > 5000 ? 0 : 1,
        boxShadow:
          timeLeft <= 5000 ? "0 0 8px rgba(59, 130, 246, 0.6)" : "none",
        transform: `scale(${timeLeft <= 5000 ? "1" : "0.98"})`,
      }}
    />
  );
}

function AnkyProgressBar({
  sessionStartTime,
}: {
  sessionStartTime: number | null;
}) {
  const elapsedTime = sessionStartTime ? Date.now() - sessionStartTime : 0;
  const isComplete = elapsedTime >= 480000;

  console.log("inside the anky progress bar", elapsedTime, sessionStartTime);

  return (
    <div
      className={`h-4 transition-all duration-100 relative overflow-hidden ${
        isComplete ? "animate-pulse" : ""
      }`}
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
    >
      {isComplete ? (
        <>
          <div className="absolute inset-0 animate-slide-1 bg-gradient-to-r from-purple-600 via-yellow-400 to-orange-500" />
          <div className="absolute inset-0 animate-slide-2 bg-gradient-to-r from-orange-500 via-purple-600 to-yellow-400" />
          <div className="absolute inset-0 animate-slide-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600" />
          <div className="absolute inset-0 animate-shimmer bg-white/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-green-600" />
      )}
    </div>
  );
}

function WritingComponent({
  text,
  prompt,
  handleTextChange,
  loading,
}: {
  text: string;
  prompt: string;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
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
      className="w-full  h-96 sm:h-full p-4 text-gray-300 bg-black placeholder:text-gray-400 text-lg sm:text-xl md:text-2xl resize-none"
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

function SessionComplete({
  sessionLongString,
  onReset,
  context,
  finalCastText,
  processingCastText,
  addFrame,
  addFrameResult,
  isSavingNotifications,
}: {
  sessionLongString: string;
  onReset: (context: FrameContext) => void;
  context: FrameContext;
  finalCastText: string | null;
  processingCastText: boolean;
  addFrame: () => void;
  addFrameResult: string;
  isSavingNotifications: boolean;
}) {
  const sessionData = extractSessionDataFromLongString(sessionLongString);
  console.log("the session data is: ", sessionData, addFrameResult);

  return (
    <div className="flex flex-col items-center justify-around h-full bg-black px-8 pt-8">
      <WritingSessionChart sessionLongString={sessionLongString} />
      <div className="w-full items-center mb-8">
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
      <button
        onClick={addFrame}
        disabled={isSavingNotifications}
        className="relative w-full py-4 px-6 text-xl font-bold text-white rounded-lg mt-2 overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff)",
          backgroundSize: "200% 200%",
          animation: "gradient 3s ease infinite",
        }}
      >
        <style jsx>{`
          @keyframes gradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          button:active {
            animation: pulse 0.3s ease-in-out;
          }
          @keyframes pulse {
            0% {
              transform: scale(0.95);
            }
            50% {
              transform: scale(1.05);
            }
            100% {
              transform: scale(0.95);
            }
          }
        `}</style>
        <div className="relative z-10">
          {isSavingNotifications ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Saving notifications...
            </span>
          ) : (
            <span>get anky notifications ✨</span>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse" />
      </button>
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
