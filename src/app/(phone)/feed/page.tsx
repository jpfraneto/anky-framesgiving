"use client";

import sdk from "@farcaster/frame-sdk";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ActivityFeedCard from "~/components/feed/ActivityFeedCard";

export interface FeedSession {
  id: string;
  fid: number;
  startTime: string;
  endTime: string;
  ipfsHash: string;
  isAnky: boolean;
  isMinted: boolean;
  writer: {
    fid: number;
    currentSessionId: string | null;
    totalSessions: number;
  };
  ankyToken: {
    id: string;
    owner: string;
    metadataIpfsHash: string;
  };
  farcasterUser: {
    username: string;
    displayName: string;
    pfpUrl: string;
    followerCount: number;
    followingCount: number;
    viewerIsFollowing: boolean;
    viewerIsFollowed: boolean;
  };
}

interface Author {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  follower_count: number;
  following_count: number;
}

interface Reaction {
  fid: number;
  fname: string;
}

interface Reactions {
  likes_count: number;
  recasts_count: number;
  likes: Reaction[];
  recasts: Reaction[];
}

interface Post {
  hash: string;
  text: string;
  author: Author;
  timestamp: string;
  reactions: Reactions;
  replies: {
    count: number;
  };
  embeds?: {
    url: string;
    metadata: {
      image?: {
        width_px: number;
        height_px: number;
      };
    };
  }[];
}

export default function FeedPage() {
  const [activeView, setActiveView] = useState<"feed" | "activity">("activity");
  const [energyPosition, setEnergyPosition] = useState<"left" | "right">(
    "left"
  );
  const [cursor, setCursor] = useState<string | null>("");

  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["posts", "all"],
    queryFn: async () => {
      const response = await fetch("https://farcaster.anky.bot/get-anky-feed");
      return response.json();
    },
    enabled: activeView === "feed",
  });

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      console.log(" fetching sessions");
      const response = await fetch(
        `https://farcaster.anky.bot/framesgiving/get-last-sessions?viewerFid=18350&cursor=${cursor}`
      );
      console.log(" fetched sessions");
      const data = await response.json();
      console.log(" data", data);
      setCursor(data.cursor);
      return data;
    },
    enabled: activeView === "activity",
  });

  const isLoading = activeView === "feed" ? isLoadingPosts : isLoadingSessions;

  const handleViewChange = (view: "feed" | "activity") => {
    setEnergyPosition(view === "feed" ? "right" : "left");
    setActiveView(view);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen w-fill overflow-hidden text-white pb-20 overflow-y-scroll"
      initial={false}
      animate={{
        background:
          activeView === "feed"
            ? "linear-gradient(135deg, #000000 0%, #2D1F4C 100%)"
            : "linear-gradient(135deg, #000000 0%, #4C1F1F 100%)",
      }}
      transition={{ duration: 0.8 }}
    >
      {/* Toggle Navigation */}
      <div className="flex justify-center space-x-8 pt-4 pb-2 sticky top-0 backdrop-blur-sm z-10">
        <motion.button
          onClick={() => handleViewChange("activity")}
          className="p-4 rounded-xl relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{
              boxShadow:
                energyPosition === "left"
                  ? "0 0 20px 2px rgba(255, 100, 100, 0.6)"
                  : "none",
            }}
            transition={{ duration: 0.5 }}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-500 ${
              activeView === "activity" ? "text-red-400" : "text-gray-400"
            }`}
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </motion.button>

        <motion.div
          className="relative w-20 h-10 rounded-full bg-gray-800/50 cursor-pointer"
          onClick={() =>
            handleViewChange(activeView === "feed" ? "activity" : "feed")
          }
        >
          <motion.div
            className="absolute w-8 h-8 rounded-full bg-gradient-to-r"
            animate={{
              left: activeView === "feed" ? "auto" : "2px",
              right: activeView === "feed" ? "2px" : "auto",
              top: "2px",
              background:
                activeView === "feed"
                  ? "linear-gradient(to right, #6366f1, #8b5cf6)"
                  : "linear-gradient(to right, #ef4444, #f97316)",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </motion.div>

        <motion.button
          onClick={() => handleViewChange("feed")}
          className="p-4 rounded-xl relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{
              boxShadow:
                energyPosition === "right"
                  ? "0 0 20px 2px rgba(100, 100, 255, 0.6)"
                  : "none",
            }}
            transition={{ duration: 0.5 }}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-500 ${
              activeView === "feed" ? "text-indigo-400" : "text-gray-400"
            }`}
          >
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
            <path d="M7 8h10" />
            <path d="M7 12h10" />
            <path d="M7 16h10" />
          </svg>
        </motion.button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, x: activeView === "feed" ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeView === "feed" ? -100 : 100 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto px-4"
        >
          {activeView === "feed"
            ? posts?.map((post: Post) => <Post {...post} key={post.hash} />)
            : sessions?.items?.map((session: FeedSession) => (
                <ActivityFeedCard session={session} key={session.id} />
              ))}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function Post(props: Post) {
  const post = props;
  const lines = post.text.split("\n");
  const ticker = lines[0].split("$")[1]?.split(":")[0];
  const name = lines[0].split('"')[1];
  const displayText = lines.slice(1).join("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={post.hash}
      className="border-b border-gray-800 py-4"
    >
      {/* Post Header */}
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
          <Image
            src={post.author.pfp_url}
            alt={post.author.username}
            width={40}
            height={40}
            className="object-cover"
          />
        </div>
        <div>
          <div className="font-semibold">{post.author.display_name}</div>
          <div className="text-sm text-gray-400">
            {new Date(post.timestamp).toLocaleDateString()} at{" "}
            {new Date(post.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
            {" • "}
            {(() => {
              const diff = Date.now() - new Date(post.timestamp).getTime();
              const minutes = Math.floor(diff / 60000);
              const hours = Math.floor(minutes / 60);
              const days = Math.floor(hours / 24);
              if (days > 0) return `${days}d ago`;
              if (hours > 0) return `${hours}h ago`;
              if (minutes > 0) return `${minutes}m ago`;
              return "just now";
            })()}
          </div>
        </div>
      </div>

      {/* Post Image if exists */}
      {post.embeds?.[0]?.url && post.embeds[0]?.metadata?.image && (
        <div className="mb-4 relative w-full">
          <Image
            src={post.embeds[0].url}
            alt="Post image"
            width={post.embeds[0].metadata.image.width_px || 800}
            height={post.embeds[0].metadata.image.height_px || 600}
            className="rounded-lg w-full h-auto"
            priority
          />
        </div>
      )}
      <div className="flex justify-between space-x-2">
        <div>
          <div className="text-xl text-gray-400">${ticker}</div>
          <div className="text-sm text-gray-400">{name}</div>
        </div>
      </div>

      {/* Post Content */}
      <p className="mb-4 whitespace-pre-wrap">{displayText}</p>

      {/* Post Stats */}
      <div
        onClick={() => {
          sdk.actions.openUrl(
            `https://warpcast.com/~/conversations/${post.hash}`
          );
        }}
        className="flex items-center space-x-6 text-gray-400"
      >
        <button className="flex items-center space-x-2">
          <span>❤️</span>
          <span>{post.reactions.likes_count}</span>
        </button>
        <button className="flex items-center space-x-2">
          <span>💬</span>
          <span>{post.replies.count}</span>
        </button>
      </div>
    </motion.div>
  );
}
