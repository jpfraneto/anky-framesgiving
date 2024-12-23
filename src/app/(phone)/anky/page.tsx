"use client";

import { useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { Send } from "lucide-react";
import axios from "axios";
import { BaseError } from "viem";
import { degen } from "viem/chains";
import {
  useConnect,
  useSwitchChain,
  useChainId,
  useAccount,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { toast } from "react-toastify";
import sdk from "@farcaster/frame-sdk";

const DEGEN_CHAIN_ID = "0x27f7b05a"; // 666666666 in hex
const DEGEN_CHAIN_CONFIG = {
  chainId: DEGEN_CHAIN_ID,
  chainName: "Degen",
  nativeCurrency: {
    name: "Degen",
    symbol: "DEGEN",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.degen.tips"],
  blockExplorerUrls: ["https://explorer.degen.tips"],
};

// Import your custom Degen chain definition
// Adjust the path as necessary:
import ankySpandasAbi from "../../../lib/ankySpandasAbi.json";

interface Message {
  id: string;
  text: string;
  sender: "user" | "anky";
  timestamp: Date;
  image_url?: string;
  ipfs_hash?: string;
  anky_spanda_id?: string;
}

const ANKY_SPANDAS_ADDRESS = "0xC83c51bf18c5E21a8111Bd7C967c1EcDB15b90E8";

export default function AnkyPage() {
  console.log("Rendering AnkyPage component");

  // Wagmi hooks
  const { connectors, connectAsync } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const account = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync: writeContract } = useWriteContract();
  console.log("the account is: ", account);
  console.log("the public client is: ", publicClient);
  console.log("the write contract is: ", writeContract);
  // Local state
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
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);

  console.log("Current wallet address:", account.address);
  console.log("Current spanda balance:", spandaBalance);
  console.log("Selected spanda type:", selectedSpandaType);
  console.log("Current chain ID:", chainId, "| typeof =", typeof chainId);

  const spandaTypes = [
    { id: 1, name: "Image", available: true },
    { id: 2, name: "4s Video (Coming Soon)", available: false },
    { id: 3, name: "16s Video (Coming Soon)", available: false },
    { id: 4, name: "48s Video (Coming Soon)", available: false },
  ];

  // Load Spanda balance on mount or when account changes
  useEffect(() => {
    const loadSpandaBalance = async () => {
      if (!account.address || !publicClient) {
        setIsLoading(false);
        return;
      }

      try {
        // Ensure we're on Degen chain before proceeding
        const chainSwitched = await ensureDegenChain(
          publicClient,
          switchChain,
          account
        );

        if (!chainSwitched) {
          toast.error("Please switch to Degen chain manually");
          setIsLoading(false);
          return;
        }

        const balance = await publicClient.readContract({
          address: ANKY_SPANDAS_ADDRESS,
          abi: ankySpandasAbi,
          functionName: "getSpandaBalance",
          args: [account.address as `0x${string}`],
        });

        setSpandaBalance(Number(balance));
      } catch (err) {
        console.error("Error loading Spanda balance:", err);
        toast.error("Error loading Spanda balance");
      } finally {
        setIsLoading(false);
      }
    };

    loadSpandaBalance();
  }, [account.address, publicClient, switchChain]);

  const ensureDegenChain = async (
    publicClient: any,
    switchChain: any,
    account: any
  ) => {
    try {
      // Check if we're already on Degen chain
      const currentChainId = await publicClient?.getChainId();
      if (currentChainId === BigInt(666666666)) {
        return true;
      }

      // Try to add the chain first
      if (window?.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: DEGEN_CHAIN_ID }],
          });
          return true;
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [DEGEN_CHAIN_CONFIG],
              });
              return true;
            } catch (addError) {
              console.error("Error adding Degen chain:", addError);
              return false;
            }
          } else {
            console.error("Error switching to Degen chain:", switchError);
            return false;
          }
        }
      }

      // Fallback to wagmi's switchChain if window.ethereum is not available
      await switchChain({ chainId: degen.id });
      return true;
    } catch (error) {
      console.error("Error ensuring Degen chain:", error);
      return false;
    }
  };

  // Function to purchase a Spanda pack
  const purchaseSpandaPack = useCallback(async () => {
    if (!publicClient || !account.address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      // Ensure we're on Degen chain
      const chainSwitched = await ensureDegenChain(
        publicClient,
        switchChain,
        account
      );

      if (!chainSwitched) {
        toast.error("Please switch to Degen chain manually");
        return;
      }

      const degenPrice = (await publicClient.readContract({
        address: ANKY_SPANDAS_ADDRESS,
        abi: ankySpandasAbi,
        functionName: "degenPriceInUSD",
      })) as bigint;

      const PACK_COST_USD = 8n * 10n ** 18n;
      const degenRequired = (PACK_COST_USD * 10n ** 18n) / degenPrice;

      // Simulate the transaction
      await publicClient.simulateContract({
        address: ANKY_SPANDAS_ADDRESS,
        abi: ankySpandasAbi,
        functionName: "purchaseSpandaPack",
        account: account.address,
        value: degenRequired,
        chain: degen,
      });

      const txHash = await writeContract({
        address: ANKY_SPANDAS_ADDRESS,
        abi: ankySpandasAbi,
        functionName: "purchaseSpandaPack",
        value: degenRequired,
        chain: degen,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

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
      console.error("Error details:", e);
      if (e instanceof BaseError) {
        if (
          e.details?.startsWith("User denied") ||
          e.details?.startsWith("User rejected")
        ) {
          toast.error("Transaction rejected");
          return;
        }
      }
      toast.error("Failed to purchase Spanda pack");
    }
  }, [publicClient, account.address, writeContract, switchChain]);

  // Button click handler for purchase
  const handlePurchase = useCallback(async () => {
    console.log("Starting handlePurchase");
    try {
      if (!account.isConnected) {
        console.log("Account not connected, attempting to connect");
        // Try switching first (may fail if not connected)
        try {
          await switchChain({ chainId: degen.id });
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

        // Double-check we’re on Degen chain
        if (chainId !== degen.id) {
          console.log("Connected but wrong chain, switching to DEGEN");
          await switchChain({ chainId: degen.id });
        }

        console.log("Successfully connected, proceeding with purchase");
        await purchaseSpandaPack();
      } else {
        console.log("Account already connected");
        // Ensure we’re on Degen chain
        if (chainId !== degen.id) {
          console.log("Wrong chain, switching to DEGEN");
          await switchChain({ chainId: degen.id });
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
    switchChain,
  ]);

  // “CLANK” your Anky to Farcaster
  const castNewAnky = async (image_url: string) => {
    try {
      const castIntent = `https://warpcast.com/~/compose?text=${encodeURIComponent(
        `@clanker deploy $change_ticker with name "change name"\n\n${lastPrompt}`
      )}&embeds[]=${encodeURIComponent(image_url)}`;
      await sdk.actions.openUrl(castIntent);
      toast.success("Successfully clanked your Anky!");
    } catch (err) {
      console.error("Error casting Anky:", err);
      toast.error("Failed to clank Anky");
    }
  };

  // Sending a text prompt to create an Anky Spanda
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
      setLastPrompt(inputMessage);
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
        text: response.data.message || "Your Anky Spanda was generated!",
        sender: "anky",
        timestamp: new Date(),
        image_url: response.data.image_url,
        ipfs_hash: response.data.ipfsHash,
        anky_spanda_id: response.data.anky_spanda_id,
      };
      console.log("Created Anky response message:", ankyMessage);

      setMessages((prev) => [...prev, ankyMessage]);

      // Refresh Spanda balance
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

  // If user isn’t connected, show a fallback
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

  // Loading state while fetching spanda balance
  if (isLoading) {
    console.log("Rendering loading state");
    return (
      <div className="flex flex-col h-full bg-purple-600/50 backdrop-blur-sm text-white items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="mt-4">Loading your Spanda balance...</p>
      </div>
    );
  }

  // Main UI
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
            Buy 88 Pack (~1 USD in $DEGEN)
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
                      onClick={() =>
                        sdk.actions.openUrl(
                          `https://www.jeeves.market/degen/asset/0xc83c51bf18c5e21a8111bd7c967c1ecdb15b90e8:${message.anky_spanda_id}`
                        )
                      }
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Marketplace
                    </button>
                    <button
                      onClick={() => castNewAnky(message.image_url!)}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Clank it
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
