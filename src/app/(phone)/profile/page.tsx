"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Settings } from "lucide-react";
import sdk from "@farcaster/frame-sdk";
import axios from "axios";
import { extractSessionDataFromLongString } from "~/lib/writing_game";

interface Anky {
  description: string;
  name: string;
  imageIpfsHash: string;
  writingSessionLongString: string;
}

interface WritingSession {
  id: string;
  fid: number;
  startTime: string;
  endTime: string;
  ipfsHash: string;
  isAnky: boolean;
  isMinted: boolean;
}

interface User {
  pfpUrl: string;
  username: string;
  fid: number;
  displayName: string;
}

export default function ProfilePage() {
  const [viewMode, setViewMode] = useState<"ankys" | "sessions" | "collected">(
    "ankys"
  );
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userAnkys, setUserAnkys] = useState<Anky[]>([]);
  const [writingSessions, setWritingSessions] = useState<WritingSession[]>([]);
  const [collectedAnkys, setCollectedAnkys] = useState<Anky[]>([]);
  console.log("the collected ankys are: ", collectedAnkys);
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const context = await sdk.context;
        let fid = 16098;

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
        console.log("IN HERE THE DATA IS", data);

        // Clear existing arrays first
        setUserAnkys([]);
        setCollectedAnkys([]);
        setWritingSessions([]);

        // Set writing sessions from data
        if (data.sessions) {
          for (const session of data.sessions) {
            try {
              console.log("IN HERE THE SESSION IS", session);
              const sessionLongString = await axios.get(
                `https://anky.mypinata.cloud/ipfs/${session.ipfsHash}?pinataGatewayToken=YbYph2pfr7ffPCBE2Pk7SyYmKhubGpzPt_soWb1XQNGQUjOnWlMVVD_Pr_VBLsjC`
              );
              console.log(
                "IN HERE THE SESSION LONG STRING IS",
                sessionLongString
              );
              const sessionData = extractSessionDataFromLongString(
                sessionLongString.data
              );
              console.log("IN HERE THE SESSION DATA IS", sessionData);
              const thisSession = {
                id: session.id,
                fid: session.fid,
                startTime: session.startTime,
                endTime: session.endTime,
                ipfsHash: session.ipfsHash,
                isAnky: session.isAnky,
                isMinted: session.isMinted,
                flow_score: sessionData.flow_score,
                total_time_written: sessionData.total_time_written,
                word_count: sessionData.word_count,
                average_wpm: sessionData.average_wpm,
              };
              setWritingSessions((prev) => [...prev, thisSession]);
            } catch (error) {
              console.log("error fetching session", error);
            }
          }
          setWritingSessions(data.sessions);
        }

        // Process anky tokens sequentially to avoid race conditions
        for (const anky of data.ankyTokens || []) {
          try {
            const metadataResponse = await axios.get(
              `https://anky.mypinata.cloud/ipfs/${anky.metadataIpfsHash}?pinataGatewayToken=YbYph2pfr7ffPCBE2Pk7SyYmKhubGpzPt_soWb1XQNGQUjOnWlMVVD_Pr_VBLsjC`
            );
            const ankyMetadata = metadataResponse.data;
            console.log("anky metadata", ankyMetadata);
            const writingSessionResponse = await axios.get(
              `https://anky.mypinata.cloud/ipfs/${ankyMetadata.writing_session?.replace(
                "ipfs://",
                ""
              )}?pinataGatewayToken=YbYph2pfr7ffPCBE2Pk7SyYmKhubGpzPt_soWb1XQNGQUjOnWlMVVD_Pr_VBLsjC`
            );
            const writingSession = writingSessionResponse.data;
            const thisAnky = {
              description: ankyMetadata.description,
              name: ankyMetadata.name,
              imageIpfsHash: ankyMetadata.image.replace("ipfs://", ""),
              writingSessionLongString: writingSession.data,
            };
            setUserAnkys((prev) => [...prev, thisAnky]);
          } catch (error) {
            console.log("error fetching pinata", error);
          }
        }

        console.log("IN HERE, THE DATA IS", data);
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
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Loading...</p>
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
          <div className="grid grid-cols-3 gap-1">
            {userAnkys.map((anky) => (
              <div key={anky.name} className="aspect-square relative">
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
          <div className="space-y-4">
            {writingSessions.map((session) => (
              <div key={session.id} className="bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-400">
                  {new Date(
                    parseInt(session.startTime) * 1000
                  ).toLocaleString()}
                </p>
                <p className="mt-2">
                  {session.isAnky ? "Minted as Anky" : "Writing Session"}
                </p>
                <p className="text-sm text-gray-400">
                  Duration:{" "}
                  {parseInt(session.endTime) - parseInt(session.startTime)}{" "}
                  seconds
                </p>
              </div>
            ))}
          </div>
        );
      case "collected":
        return (
          <div className="grid grid-cols-3 gap-1">
            {/* {collectedAnkys.map((anky) => (
              <div key={anky.anky_id} className="aspect-square relative">
                <Image
                  src={anky.image_url}
                  alt={anky.prompt}
                  fill
                  className="object-cover"
                />
              </div>
            ))} */}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-2xl mx-auto px-4">
        {/* Profile Header */}
        <div className="flex items-center justify-between py-8">
          <div className="flex items-center gap-4 w-full">
            <div className="relative w-24 h-24 rounded-full overflow-hidden">
              <Image
                src={
                  user.pfpUrl ||
                  "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true"
                }
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
                <div className="flex gap-2 ml-auto">
                  <Link href="/settings">
                    <Settings size={24} />
                  </Link>
                </div>
              </div>
              <div className="flex gap-8 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userAnkys.length}</div>
                  <div className="text-gray-400">ankys</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex border-b border-gray-800 mb-6">
          {["ankys", "sessions", "collected"].map((mode) => (
            <button
              key={mode}
              onClick={() =>
                setViewMode(mode as "ankys" | "sessions" | "collected")
              }
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

        {/* Content */}
        <div className="mt-6">{renderContent()}</div>
      </div>
    </div>
  );
}
