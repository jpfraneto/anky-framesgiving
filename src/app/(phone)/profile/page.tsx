"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Settings, X, ArrowUpDown } from "lucide-react";
import sdk from "@farcaster/frame-sdk";
import axios from "axios";
import { extractSessionDataFromLongString } from "~/lib/writing_game";

interface Anky {
  description: string;
  name: string;
  imageIpfsHash: string;
  writingSessionLongString: string;
  text: string;
  prompt: string;
}

interface ApiSession {
  id: string;
  fid: number;
  startTime: string;
  endTime: string;
  ipfsHash: string;
  isAnky: boolean;
  isMinted: boolean;
  session_text: string;
}

interface ApiAnkyToken {
  metadataIpfsHash: string;
}

interface WritingSession {
  id: string;
  fid: number;
  startTime: string;
  endTime: string;
  ipfsHash: string;
  isAnky: boolean;
  isMinted: boolean;
  text: string;
  flow_score: number;
  total_time_written: number;
  word_count: number;
  average_wpm: number;
}

interface User {
  pfpUrl: string;
  username: string;
  fid: number;
  displayName: string;
}

type SortField = "flow_score" | "word_count" | "date";
type SortDirection = "asc" | "desc";

export default function ProfilePage() {
  const [viewMode, setViewMode] = useState<"ankys" | "sessions">("ankys");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userAnkys, setUserAnkys] = useState<Anky[]>([]);
  const [writingSessions, setWritingSessions] = useState<WritingSession[]>([]);
  const [selectedAnky, setSelectedAnky] = useState<Anky | null>(null);
  const [selectedSession, setSelectedSession] = useState<WritingSession | null>(
    null
  );
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortSessions = (sessions: WritingSession[]) => {
    return [...sessions].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "flow_score":
          comparison = a.flow_score - b.flow_score;
          break;
        case "word_count":
          comparison = a.word_count - b.word_count;
          break;
        case "date":
          comparison = parseInt(a.startTime) - parseInt(b.startTime);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const context = await sdk.context;
        let fid = 18350;

        if (context?.user) {
          setUser({
            pfpUrl:
              context.user.pfpUrl ||
              "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true",
            username: context.user.username || "anky",
            fid: context.user.fid,
            displayName: context.user.displayName || "Anky",
          });
          fid = context.user.fid;
        } else {
          setUser({
            pfpUrl:
              "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true",
            username: "anky",
            fid: 18350,
            displayName: "Anky",
          });
        }

        const response = await fetch(`https://ponder.anky.bot/writer/${fid}`);
        const data = await response.json();

        setUserAnkys([]);
        setWritingSessions([]);

        if (data.sessions) {
          const processedSessions = await Promise.all(
            data.sessions.map(async (session: ApiSession) => {
              if (!session.ipfsHash) return null;

              try {
                const sessionLongStringRequest = await fetch(
                  `https://anky.mypinata.cloud/ipfs/${session.ipfsHash}`
                );
                const sessionLongStringResponse =
                  await sessionLongStringRequest.text();
                const sessionData = extractSessionDataFromLongString(
                  sessionLongStringResponse
                );

                return {
                  id: session.id,
                  fid: session.fid,
                  startTime: session.startTime,
                  prompt: sessionData.prompt,
                  text: sessionData.session_text,
                  endTime: session.endTime,
                  ipfsHash: session.ipfsHash,
                  isAnky: session.isAnky,
                  isMinted: session.isMinted,
                  flow_score: sessionData.flow_score,
                  total_time_written: sessionData.total_time_written,
                  word_count: sessionData.word_count,
                  average_wpm: sessionData.average_wpm,
                };
              } catch (error) {
                console.log("error fetching session", error);
                return null;
              }
            })
          );

          setWritingSessions(processedSessions.filter(Boolean));
        }

        if (data.ankyTokens) {
          const processedAnkys = await Promise.all(
            data.ankyTokens.map(async (anky: ApiAnkyToken) => {
              try {
                const metadataResponse = await axios.get(
                  `https://anky.mypinata.cloud/ipfs/${anky.metadataIpfsHash}`
                );
                const ankyMetadata = metadataResponse.data;
                const writingSessionResponse = await axios.get(
                  `https://anky.mypinata.cloud/ipfs/${ankyMetadata.writing_session?.replace(
                    "ipfs://",
                    ""
                  )}`
                );
                const sessionData = extractSessionDataFromLongString(
                  writingSessionResponse.data
                );
                return {
                  description: ankyMetadata.description,
                  name: ankyMetadata.name,
                  imageIpfsHash: ankyMetadata.image.replace("ipfs://", ""),
                  writingSessionLongString: writingSessionResponse.data,
                  text: sessionData.session_text,
                };
              } catch (error) {
                console.log("error fetching anky", error);
                return null;
              }
            })
          );

          setUserAnkys(processedAnkys.filter(Boolean).reverse());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser({
          pfpUrl:
            "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true",
          username: "anky",
          fid: 18350,
          displayName: "Anky",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <p>Please access this page from a Farcaster client</p>
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

  const renderContent = () => {
    switch (viewMode) {
      case "ankys":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {userAnkys.map((anky) => (
              <div
                key={anky.name}
                className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedAnky(anky)}
              >
                <Image
                  src={`https://anky.mypinata.cloud/ipfs/${anky.imageIpfsHash}?pinataGatewayToken=YbYph2pfr7ffPCBE2Pk7SyYmKhubGpzPt_soWb1XQNGQUjOnWlMVVD_Pr_VBLsjC`}
                  alt={anky.name}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        );
      case "sessions":
        return (
          <>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => toggleSort("flow_score")}
                className={`flex items-center gap-1 px-3 py-1 rounded ${
                  sortField === "flow_score" ? "bg-purple-600" : "bg-gray-700"
                }`}
              >
                Flow Score
                <ArrowUpDown size={16} />
              </button>
              <button
                onClick={() => toggleSort("word_count")}
                className={`flex items-center gap-1 px-3 py-1 rounded ${
                  sortField === "word_count" ? "bg-purple-600" : "bg-gray-700"
                }`}
              >
                Words
                <ArrowUpDown size={16} />
              </button>
              <button
                onClick={() => toggleSort("date")}
                className={`flex items-center gap-1 px-3 py-1 rounded ${
                  sortField === "date" ? "bg-purple-600" : "bg-gray-700"
                }`}
              >
                Date
                <ArrowUpDown size={16} />
              </button>
            </div>
            <div className="space-y-4">
              {sortSessions(writingSessions).map((session) => (
                <div
                  key={session.id}
                  className="bg-gray-900 p-4 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-400">
                      {new Date(
                        parseInt(session.startTime) * 1000
                      ).toLocaleString()}
                    </p>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        session.isAnky ? "bg-purple-600" : "bg-gray-700"
                      }`}
                    >
                      {session.isAnky ? "Minted as Anky" : "Writing Session"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Words</p>
                      <p>{session.word_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Flow Score</p>
                      <p>{session.flow_score}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between py-8">
          <div className="flex items-center gap-4 w-full">
            <div className="relative w-24 h-24 rounded-full overflow-hidden">
              <Image
                src={user.pfpUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 px-4 w-full">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                  @{user.username || user.fid}
                </h1>
                <Link href="/settings">
                  <Settings size={24} />
                </Link>
              </div>
              <div className="flex gap-8 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userAnkys.length}</div>
                  <div className="text-gray-400">ankys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {writingSessions.length}
                  </div>
                  <div className="text-gray-400">sessions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-800 mb-6">
          {["ankys", "sessions"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as "ankys" | "sessions")}
              className={`px-6 py-3 ${
                viewMode === mode
                  ? "border-b-2 border-white font-medium"
                  : "text-gray-500"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-6">{renderContent()}</div>

        {selectedAnky && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 flex justify-between items-center border-b border-gray-800">
                <h3 className="text-xl font-bold">{selectedAnky.name}</h3>
                <button onClick={() => setSelectedAnky(null)}>
                  <X size={24} />
                </button>
              </div>
              <div className="p-4">
                <div className="aspect-square relative rounded-lg overflow-hidden mb-4">
                  <Image
                    src={`https://anky.mypinata.cloud/ipfs/${selectedAnky.imageIpfsHash}?pinataGatewayToken=YbYph2pfr7ffPCBE2Pk7SyYmKhubGpzPt_soWb1XQNGQUjOnWlMVVD_Pr_VBLsjC`}
                    alt={selectedAnky.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {selectedAnky.description}
                </p>
                <div className="mt-4">
                  <h4 className="font-medium mb-2 text-xl text-purple-600">
                    {selectedAnky.prompt}
                  </h4>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {selectedAnky.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 flex justify-between items-center border-b border-gray-800">
                <h3 className="text-xl font-bold">Writing Session</h3>
                <button onClick={() => setSelectedSession(null)}>
                  <X size={24} />
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400">Date</p>
                    <p>
                      {new Date(
                        parseInt(selectedSession.startTime) * 1000
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Duration</p>
                    <p>
                      {Math.round(
                        (parseInt(selectedSession.endTime) -
                          parseInt(selectedSession.startTime)) /
                          60
                      )}{" "}
                      minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Words</p>
                    <p>{selectedSession.word_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Average WPM</p>
                    <p>{selectedSession.average_wpm}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Flow Score</p>
                    <p>{selectedSession.flow_score}</p>
                  </div>
                </div>
                <hr className="my-1 border-blue-200" />
                <hr className="my-1 border-purple-200" />
                <hr className="my-1 border-yellow-200" />
                <div className="mt-4">
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {selectedSession.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
