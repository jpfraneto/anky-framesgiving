"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { User, Settings, Grid, BookOpen } from "lucide-react";

interface Post {
  id: string;
  imageUrl: string;
  likes: number;
  caption: string;
  timestamp: string;
}

export default function ProfilePage() {
  const { address } = useAccount();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockPosts = [
      {
        id: "1",
        imageUrl: "https://picsum.photos/400/400",
        likes: 123,
        caption: "My first Anky writing session",
        timestamp: "2024-02-20",
      },
      {
        id: "2",
        imageUrl: "https://picsum.photos/400/400",
        likes: 89,
        caption: "Another beautiful writing session",
        timestamp: "2024-02-19",
      },
    ];

    setPosts(mockPosts);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 px-4">
      {/* Profile Header */}
      <div className="flex items-center justify-between py-8">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden">
            <Image
              src="https://picsum.photos/200"
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">Anky Writer</h1>
            <p className="text-sm text-gray-500">
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "Not connected"}
            </p>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <Settings size={24} />
        </button>
      </div>

      {/* Stats */}
      <div className="flex justify-around py-4 border-y">
        <div className="text-center">
          <div className="font-bold">{posts.length}</div>
          <div className="text-sm text-gray-500">Posts</div>
        </div>
        <div className="text-center">
          <div className="font-bold">245</div>
          <div className="text-sm text-gray-500">Writing Hours</div>
        </div>
        <div className="text-center">
          <div className="font-bold">12</div>
          <div className="text-sm text-gray-500">Ankys</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-around py-4">
        <button className="p-2">
          <Grid size={24} />
        </button>
        <button className="p-2">
          <BookOpen size={24} />
        </button>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post) => (
          <div key={post.id} className="aspect-square relative">
            <Image
              src={post.imageUrl}
              alt={post.caption}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
