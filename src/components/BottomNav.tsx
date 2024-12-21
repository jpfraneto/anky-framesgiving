"use client";
import React from "react";
import Link from "next/link";
import { Scroll, Trophy, User, Sparkles } from "lucide-react";
import { useAnky } from "~/context/AnkyContext";

const BottomNav = () => {
  const { isUserWriting, setIsWritingGameVisible, isWritingGameVisible } =
    useAnky();

  // Don't render anything if user is writing
  if (isUserWriting) return null;

  // If writing game is visible, only render the alien button
  if (isWritingGameVisible && !isUserWriting) {
    return (
      <div className="sticky bottom-3 left-0 right-0 flex justify-center">
        <button
          className="bg-purple-500 p-4 w-[55px] h-[55px] rounded-full shadow-lg hover:bg-purple-600 transition-colors text-xl"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(5);
            }
            setIsWritingGameVisible(false);
          }}
          style={{
            opacity: 0.66,
          }}
        >
          👽
        </button>
      </div>
    );
  }

  // Otherwise render full nav bar
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-[#1a1f3d] border-t-2 border-[#ff6b00] py-3 w-full">
      <nav className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around items-center">
          <Link href="/feed" className="flex flex-col items-center">
            <Scroll
              size={24}
              className="text-white opacity-80 hover:opacity-100"
            />
          </Link>

          <Link href="/anky" className="flex flex-col items-center">
            <Sparkles
              size={24}
              className="text-white opacity-80 hover:opacity-100"
            />
          </Link>

          <div className="relative -mt-8">
            <button
              className="bg-purple-700 p-4 w-[55px] h-[55px] rounded-full shadow-lg hover:bg-purple-600 transition-colors text-xl"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(5);
                }
                setIsWritingGameVisible(true);
              }}
            >
              👽
            </button>
          </div>

          <Link href="/leaderboard" className="flex flex-col items-center">
            <Trophy
              size={24}
              className="text-white opacity-80 hover:opacity-100"
            />
          </Link>

          <Link href="/profile" className="flex flex-col items-center">
            <User
              size={24}
              className="text-white opacity-80 hover:opacity-100"
            />
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;
