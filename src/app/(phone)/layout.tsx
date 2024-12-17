"use client";

import { useEffect, useState } from "react";
import BottomNav from "~/components/BottomNav";
import { useAnky } from "~/context/AnkyContext";
import dynamic from "next/dynamic";

const WritingGame = dynamic(() => import("~/components/WritingGame"), {
  ssr: false,
});

const rainbowColors = [
  "#FF0000", // Red
  "#FF7F00", // Orange
  "#FFFF00", // Yellow
  "#00FF00", // Green
  "#0000FF", // Blue
  "#4B0082", // Indigo
  "#9400D3", // Violet
];

export default function PhoneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBrowser, setIsBrowser] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [offset, setOffset] = useState(0);
  const { isWritingGameVisible } = useAnky();

  useEffect(() => {
    setIsBrowser(typeof window !== "undefined");
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // Adjust breakpoint as needed
    };

    if (typeof window !== "undefined") {
      checkIsDesktop();
      window.addEventListener("resize", checkIsDesktop);

      const animate = () => {
        setOffset((prev) => (prev + 1) % 200);
        requestAnimationFrame(animate);
      };
      const animation = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener("resize", checkIsDesktop);
        cancelAnimationFrame(animation);
      };
    }
  }, []);

  if (!isBrowser) return null;

  // Mobile layout - simple and functional
  if (!isDesktop) {
    return (
      <div className="h-full w-full bg-black overflow-y-auto">
        <div className="h-full w-full bg-white">
          {children}
          {isWritingGameVisible && (
            <div className="fixed inset-0 bg-black bg-opacity-90">
              <WritingGame />
            </div>
          )}
          <BottomNav />
        </div>
      </div>
    );
  }

  // Desktop layout - fancy phone-like UI
  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Background with repeating "anky" text */}
      <div className="absolute inset-0 -z-10">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute whitespace-nowrap text-6xl font-bold opacity-20 transition-transform duration-1000 ease-in-out"
            style={{
              transform: `rotate(-8deg) translate(${100}px, ${
                i * 100 - offset
              }px)`,
              color: rainbowColors[i % rainbowColors.length],
              filter: "drop-shadow(0 0 8px currentColor)",
              animation: `pulse ${2 + (i % 3)}s ease-in-out infinite`,
            }}
          >
            {Array.from({ length: 10 }).map((_, j) => (
              <span
                key={j}
                className="mx-4 inline-block hover:scale-110 transition-transform"
                style={{
                  animation: `float ${3 + ((i + j) % 4)}s ease-in-out infinite`,
                }}
              >
                anky
              </span>
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>

      {/* Phone-like container */}
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-[380px] h-[700px] bg-black rounded-[40px] p-4 shadow-2xl border-4 border-gray-800">
          <div className="w-full h-full bg-white rounded-[32px] overflow-y-auto relative">
            {children}
            {isWritingGameVisible && (
              <div className="absolute inset-0 bg-black bg-opacity-90">
                <WritingGame />
              </div>
            )}
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  );
}
