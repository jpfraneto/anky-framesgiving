"use client";

import { useEffect, useState } from "react";

const rainbowColors = [
  "#FF0000", // Red
  "#FF7F00", // Orange
  "#FFFF00", // Yellow
  "#00FF00", // Green
  "#0000FF", // Blue
  "#4B0082", // Indigo
  "#9400D3", // Violet
];

export default function HomePage() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const animate = () => {
      setOffset((prev) => (prev + 1) % 200);
      requestAnimationFrame(animate);
    };

    const animation = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animation);
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
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
    </div>
  );
}
