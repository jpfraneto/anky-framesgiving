"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Writer {
  fid: number;
  maxStreak: number;
  writer: {
    totalSessions: number;
  };
  farcaster: {
    username: string;
    displayName: string;
    pfpUrl: string;
  };
}

export default function LeaderboardPage() {
  const [writers, setWriters] = useState<Writer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch(
          "https://farcaster.anky.bot/framesgiving/leaderboard"
        );
        const data = await response.json();
        setWriters(data.data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen md:w-full md:h-fullbg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen md:w-full md:h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex flex-col">
      <h1 className="text-4xl font-bold py-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
        Anky Writers Leaderboard
      </h1>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-purple-500/30">
              <th className="px-2 py-2 text-left text-sm font-semibold text-purple-300">
                Rank
              </th>
              <th className="px-2 py-2 text-left text-sm font-semibold text-purple-300">
                Writer
              </th>
              <th className="px-2 py-2 text-center text-sm font-semibold text-purple-300">
                Max Streak
              </th>
              <th className="px-2 py-2 text-center text-sm font-semibold text-purple-300">
                Total Sessions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/20">
            {writers.map((writer, index) => (
              <tr
                key={writer.fid}
                className="hover:bg-purple-500/10 transition-colors"
              >
                <td className="px-2 py-2 text-cyan-400 font-bold">
                  #{index + 1}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-purple-500/30">
                      <Image
                        src={writer.farcaster.pfpUrl}
                        alt={writer.farcaster.displayName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-pink-300">
                        {writer.farcaster.displayName}
                      </span>
                      <span className="text-xs text-purple-400">
                        @{writer.farcaster.username}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className="inline-block bg-pink-500/20 px-2 py-1 rounded-full text-pink-300">
                    {writer.maxStreak} days
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className="inline-block bg-cyan-500/20 px-2 py-1 rounded-full text-cyan-300">
                    {writer.writer.totalSessions}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
