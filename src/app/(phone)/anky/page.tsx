"use client";

import { useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { Send } from "lucide-react";
import axios from "axios";
import { BaseError } from "viem";
import { degen } from "viem/chains";
import { useConnect, useSwitchChain, useChainId } from "wagmi";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "react-toastify";
import sdk from "@farcaster/frame-sdk";

console.log("degen chain ID = ", degen.id);
console.log("degen RPC URLs = ", degen.rpcUrls);

import ankySpandasAbi from "../../../lib/ankySpandasAbi.json";

interface Message {
  id: string;
  text: string;
  sender: "user" | "anky";
  timestamp: Date;
  image_url?: string;
  ipfs_hash?: string;
}

const ANKY_SPANDAS_ADDRESS = "0xC83c51bf18c5E21a8111Bd7C967c1EcDB15b90E8";

export default function AnkyPage() {
  console.log("Rendering AnkyPage component");
  const { connectors, connectAsync } = useConnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const account = useAccount();
  const { writeContractAsync: writeContract } = useWriteContract();
  const publicClient = usePublicClient();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm Anky, your creative companion. You can use your Spandas to generate AI art through me.",
      sender: "anky",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [spandaBalance, setSpandaBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpandaType, setSelectedSpandaType] = useState<number>(1);

  console.log("Current wallet address:", account.address);
  console.log("Current spanda balance:", spandaBalance);
  console.log("Selected spanda type:", selectedSpandaType);
  console.log("the current chain id is", chainId);

  console.log("chainId =", chainId, " typeof =", typeof chainId);
  console.log("degen.id =", degen.id, " typeof =", typeof degen.id);

  const spandaTypes = [
    { id: 1, name: "Image", available: true },
    { id: 2, name: "4s Video (Coming Soon)", available: false },
    { id: 3, name: "16s Video (Coming Soon)", available: false },
    { id: 4, name: "48s Video (Coming Soon)", available: false },
  ];

  useEffect(() => {
    console.log("Running loadSpandaBalance effect");

    const loadSpandaBalance = async () => {
      if (!account.address || !publicClient) {
        console.log("No wallet address found, skipping balance load");
        return;
      }

      try {
        console.log("Fetching spanda balance for address:", account.address);
        const balance = await publicClient.readContract({
          address: ANKY_SPANDAS_ADDRESS,
          abi: ankySpandasAbi,
          functionName: "getSpandaBalance",
          args: [account.address as `0x${string}`],
        });

        console.log("Raw balance from contract:", balance);
        setSpandaBalance(Number(balance));
      } catch (err) {
        console.error("Error loading Spanda balance:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSpandaBalance();
  }, [account.address]);

  const purchaseSpandaPack = useCallback(async () => {
    console.log("🚀 Starting purchaseSpandaPack function");
    if (!publicClient || !account.address) {
      console.log("❌ No public client or account address found");
      return;
    }

    // First ensure we're on Degen chain
    if (chainId !== degen.id) {
      console.log("Wrong chain, need to switch to DEGEN first");
      try {
        await switchChainAsync({ chainId: degen.id });
      } catch (e) {
        console.error("Failed to switch to DEGEN chain:", e);
        toast.error("Please switch to DEGEN chain");
        return;
      }
    }

    try {
      const degenPrice = (await publicClient.readContract({
        address: ANKY_SPANDAS_ADDRESS,
        abi: ankySpandasAbi,
        functionName: "degenPriceInUSD",
      })) as bigint;
      console.log("💰 DEGEN price:", degenPrice.toString());

      const PACK_COST_USD = 8n * 10n ** 18n;
      const degenRequired = (8n * PACK_COST_USD * 10n ** 18n) / degenPrice;
      console.log("💵 DEGEN required for purchase:", degenRequired.toString());

      // Simulate with explicit chain ID
      await publicClient.simulateContract({
        address: ANKY_SPANDAS_ADDRESS,
        abi: ankySpandasAbi,
        functionName: "purchaseSpandaPack",
        account: account.address,
        value: degenRequired,
        chain: degen,
      });
      console.log("🔄 Simulation successful!");

      const txHash = await writeContract({
        address: ANKY_SPANDAS_ADDRESS,
        abi: ankySpandasAbi,
        functionName: "purchaseSpandaPack",
        value: degenRequired,
        chain: degen,
      });

      console.log("📨 Transaction hash:", txHash);
      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      // Update balance after successful purchase
      const newBalance = await publicClient.readContract({
        address: ANKY_SPANDAS_ADDRESS,
        abi: ankySpandasAbi,
        functionName: "getSpandaBalance",
        args: [account.address],
      });

      setSpandaBalance(Number(newBalance));
      toast.success("Successfully purchased Spanda pack!");
    } catch (e) {
      console.error("💥 Error details:", e);
      if (e instanceof BaseError) {
        if (
          e.details?.startsWith("User denied") ||
          e.details?.startsWith("User rejected")
        ) {
          console.log("🚫 User rejected the transaction");
          return;
        }
      }
      toast.error("Failed to purchase Spanda pack");
    }
  }, [publicClient, account.address, writeContract, chainId, switchChainAsync]);

  const handlePurchase = useCallback(async () => {
    console.log("Starting handlePurchase");
    try {
      if (!account.isConnected) {
        console.log("Account not connected, attempting to connect");
        // First try to switch to Degen chain (this might fail if not connected yet)
        try {
          await switchChainAsync({ chainId: degen.id });
        } catch (e) {
          console.log("Chain switch failed, will connect first:", e);
        }

        // Now connect, explicitly specifying Degen chain
        const connectResult = await connectAsync({
          connector: connectors[0]!,
          chainId: degen.id,
        });
        console.log("Connect result:", connectResult);

        if (!connectResult.accounts.length) {
          console.log("Connection failed - no addresses returned");
          toast.error("Unable to connect: no addresses");
          return;
        }

        // Double check we're on Degen chain after connection
        if (chainId !== degen.id) {
          console.log("Connected but wrong chain, switching to DEGEN");
          await switchChainAsync({ chainId: degen.id });
        }

        console.log("Successfully connected, proceeding with purchase");
        await purchaseSpandaPack();
      } else {
        console.log("Account already connected");
        // Always ensure we're on Degen chain before proceeding
        if (chainId !== degen.id) {
          console.log("Wrong chain, switching to DEGEN");
          await switchChainAsync({ chainId: degen.id });
        }

        console.log("Proceeding with purchase");
        await purchaseSpandaPack();
      }
    } catch (e) {
      console.log("Error in handlePurchase:", e);
      if (e instanceof BaseError) {
        if (
          e.details?.startsWith("User denied") ||
          e.details?.startsWith("User rejected")
        ) {
          console.log("User rejected the request");
          return;
        }
      }
      toast.error("Unable to connect.");
      console.error(e);
    }
  }, [
    account.isConnected,
    connectAsync,
    connectors,
    purchaseSpandaPack,
    chainId,
    switchChainAsync,
  ]);

  const castNewAnky = async (image_url: string) => {
    try {
      const castIntent = `https://warpcast.com/~/compose?text=${encodeURIComponent(
        `@clanker deploy $change_ticker with name "change name" ${image_url}`
      )}`;

      await sdk.actions.openUrl(castIntent);
      toast.success("Successfully clanked your Anky!");
    } catch (err) {
      console.error("Error casting Anky:", err);
      toast.error("Failed to clank Anky");
    }
  };

  const handleSendMessage = async () => {
    console.log("Handling send message");
    if (!inputMessage.trim() || !spandaBalance || spandaBalance < 1) {
      console.log("Invalid message or insufficient balance, aborting send");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };
    console.log("Created user message:", userMessage);

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      console.log("Sending request to create Anky Spanda");
      const response = await axios.post(
        "https://farcaster.anky.bot/framesgiving/create-new-anky-spanda",
        {
          prompt: inputMessage,
          userWallet: account.address,
          spanda_type: selectedSpandaType,
          fid: 18350,
        }
      );

      console.log("Anky Spanda creation response:", response.data);

      const ankyMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.message || "Your Anky Spanda is being generated!",
        sender: "anky",
        timestamp: new Date(),
        image_url: response.data.image_url,
        ipfs_hash: response.data.ipfsHash,
      };
      console.log("Created Anky response message:", ankyMessage);

      setMessages((prev) => [...prev, ankyMessage]);

      if (account.address && publicClient) {
        console.log("Refreshing Spanda balance after creation");
        const newBalance = await publicClient.readContract({
          address: ANKY_SPANDAS_ADDRESS,
          abi: ankySpandasAbi,
          functionName: "getSpandaBalance",
          args: [account.address],
        });
        console.log("Updated spanda balance:", newBalance);
        setSpandaBalance(Number(newBalance));
      }
    } catch (err) {
      console.error("Error creating AnkySpanda:", err);
      toast.error("Failed to create AnkySpanda");
    } finally {
      setIsTyping(false);
    }
  };

  if (!account.address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <p>Please access this app from a Farcaster client</p>
        <div className="mt-4 bg-white p-2 rounded-lg">
          <a href="https://warpcast.com">
            <Image
              src="https://warpcast.com/og-logo.png"
              alt="Warpcast"
              width={100}
              height={100}
            />
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    console.log("Rendering loading state");
    return (
      <div className="flex flex-col h-full bg-purple-600/50 backdrop-blur-sm text-white items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="mt-4">Loading your Spanda balance...</p>
      </div>
    );
  }

  console.log("Rendering main UI");
  return (
    <div className="flex flex-col h-full bg-black text-white pb-16 overflow-y-scroll">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b border-gray-800">
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
          <Image
            src="https://github.com/jpfraneto/images/blob/main/anky.png?raw=true"
            alt="Anky"
            width={40}
            height={40}
          />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Anky</h1>
          <p className="text-sm text-gray-400">Your creative companion</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Spanda Balance</p>
          <p className="text-lg font-bold text-purple-500">
            {spandaBalance ?? 0}
          </p>
          <button
            onClick={handlePurchase}
            className="mt-2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm hover:bg-purple-700 transition-colors"
          >
            Buy Pack (8 usd in $degen)
          </button>
        </div>
      </div>

      {/* Spanda Type Selection */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        {spandaTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              if (type.available) {
                console.log("Selecting spanda type:", type.id);
                setSelectedSpandaType(type.id);
              }
            }}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              selectedSpandaType === type.id && type.available
                ? "bg-purple-600"
                : type.available
                ? "bg-gray-800 hover:bg-gray-700"
                : "bg-gray-800 opacity-50 cursor-not-allowed"
            }`}
            disabled={!type.available}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-white"
              }`}
            >
              <p>{message.text}</p>
              {message.image_url && (
                <div className="mt-2">
                  <Image
                    src={message.image_url}
                    alt="Generated Anky"
                    width={300}
                    height={300}
                    className="rounded-lg"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => sdk.actions.openUrl(message.image_url!)}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => castNewAnky(message.image_url!)}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      CLANK
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => {
              console.log("Input message changed:", e.target.value);
              setInputMessage(e.target.value);
            }}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={
              spandaBalance && spandaBalance > 0
                ? "Write your prompt..."
                : "Purchase Spandas to start creating..."
            }
            disabled={!spandaBalance || spandaBalance < 1}
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!spandaBalance || spandaBalance < 1}
            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:hover:bg-purple-600"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
