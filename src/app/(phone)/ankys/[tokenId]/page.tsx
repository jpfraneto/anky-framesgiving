"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";

interface AnkyMetadata {
  name: string;
  description: string;
  image: string;
  writing_session: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
}

export default function AnkyPage() {
  const searchParams = useSearchParams();
  const tokenId = searchParams.get("tokenId");
  const metadataIpfsHash = searchParams.get("metadataIpfsHash");

  const {
    data: metadata,
    isLoading,
    error,
  } = useQuery<AnkyMetadata>({
    queryKey: ["anky", tokenId, metadataIpfsHash],
    queryFn: async () => {
      if (!metadataIpfsHash) throw new Error("No metadata IPFS hash provided");
      const response = await fetch(
        `https://anky.mypinata.cloud/ipfs/${metadataIpfsHash}`
      );
      if (!response.ok) throw new Error("Failed to fetch metadata");
      return response.json();
    },
    enabled: !!metadataIpfsHash,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Anky</h2>
          <p className="text-red-400">Failed to load anky metadata</p>
        </div>
      </div>
    );
  }

  // Extract writing session hash from ipfs:// URL
  const writingSessionHash = metadata.writing_session.replace("ipfs://", "");
  const imageHash = metadata.image.replace("ipfs://", "");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-black/30 p-6 rounded-lg">
          <div className="mb-6">
            <Image
              src={`https://anky.mypinata.cloud/ipfs/${imageHash}`}
              alt={metadata.name}
              width={400}
              height={400}
              className="rounded-lg mx-auto"
            />
          </div>

          <h1 className="text-3xl font-bold mb-4">{metadata.name}</h1>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              {metadata.attributes.map((attr) => (
                <div key={attr.trait_type} className="bg-black/20 p-4 rounded">
                  <p className="text-sm text-gray-400">{attr.trait_type}</p>
                  <p className="text-xl font-bold">{attr.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="prose prose-invert max-w-none mb-6">
            <div className="bg-black/20 p-4 rounded-lg whitespace-pre-wrap">
              {metadata.description}
            </div>
          </div>

          <Link
            href={`/session/${writingSessionHash}`}
            className="inline-block bg-purple-600 hover:bg-purple-700 transition-colors duration-200 px-6 py-3 rounded-lg font-semibold"
          >
            View Writing Session
          </Link>
        </div>
      </div>
    </div>
  );
}
