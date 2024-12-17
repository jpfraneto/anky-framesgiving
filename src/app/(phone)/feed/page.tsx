"use client";

import sdk from "@farcaster/frame-sdk";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

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
  // const [activeTab, setActiveTab] = useState<"all" | "followed">("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", "all"],
    queryFn: async () => {
      const response = await fetch("https://farcaster.anky.bot/get-anky-feed");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 overflow-y-scroll">
      {/* Tab Navigation */}
      {/* <div className="flex justify-center space-x-8 pt-4 pb-2 sticky top-0 bg-black z-10">
        {["all", "followed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "all" | "followed")}
            className={`px-6 py-2 rounded-full ${
              activeTab === tab ? "bg-white/10" : ""
            }`}
          >
            <span
              className={`text-lg ${
                activeTab === tab ? "opacity-100" : "opacity-60"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </span>
          </button>
        ))}
      </div> */}

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto px-4">
        {posts?.map((post: Post) => (
          <Post {...post} key={post.hash} />
        ))}
      </div>
    </div>
  );
}

function Post(props: Post) {
  const post = props;
  const lines = post.text.split("\n");
  const ticker = lines[0].split("$")[1]?.split(":")[0];
  const name = lines[0].split('"')[1];
  const displayText = lines.slice(1).join("\n");
  console.log("the ticker is", ticker);
  console.log("the name is", name);
  return (
    <div key={post.hash} className="border-b border-gray-800 py-4">
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
        <div className="items-center flex-col flex h-fit bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 p-2 rounded-lg  shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <span className="font-bold text-white bg-clip-text bg-gradient-to-r from-yellow-200 via-green-200 to-purple-300 animate-gradient">
            💲 ??? usd
          </span>
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
    </div>
  );
}
