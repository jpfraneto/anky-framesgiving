"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { extractSessionDataFromLongString } from "~/lib/writing_game";

export default function SessionPage() {
  const params = useParams();
  const ipfsHash = params.ipfsHash as string;

  const {
    data: sessionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session", ipfsHash],
    queryFn: async () => {
      const response = await fetch(
        `https://anky.mypinata.cloud/ipfs/${ipfsHash}`
      );
      const longString = await response.text();
      console.log("the long string is", longString);
      return extractSessionDataFromLongString(longString);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Session</h2>
          <p className="text-red-400">Failed to load writing session data</p>
        </div>
      </div>
    );
  }

  if (!sessionData) return null;

  console.log("the session data is", sessionData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-black/30 p-6 rounded-lg">
          <h1 className="text-2xl font-bold mb-2">{sessionData.prompt}</h1>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 p-4 rounded">
                <p className="text-sm text-gray-400">Words</p>
                <p className="text-2xl font-bold">{sessionData.word_count}</p>
              </div>
              <div className="bg-black/20 p-4 rounded">
                <p className="text-sm text-gray-400">Avg. WPM</p>
                <p className="text-2xl font-bold">
                  {Math.round(sessionData.average_wpm)}
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded">
                <p className="text-sm text-gray-400">Time Written</p>
                <p className="text-2xl font-bold">
                  {Math.round(sessionData.total_time_written / 1000)} seconds
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded">
                <p className="text-sm text-gray-400">Flow Score</p>
                <p className="text-2xl font-bold">
                  {Math.round(sessionData.flow_score)}%
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="bg-black/20 p-4 rounded-lg whitespace-pre-wrap font-mono">
              {sessionData.session_text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
