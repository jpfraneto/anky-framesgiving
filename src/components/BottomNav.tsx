import React from "react";
import Link from "next/link";
import {
  Scroll,
  Gamepad2,
  PenLine,
  Wallet,
  User,
  Sparkles,
} from "lucide-react";

const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1f3d] border-t-2 border-[#ff6b00] py-3">
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
            <button className="bg-purple-500 p-4 rounded-full shadow-lg hover:bg-purple-600 transition-colors">
              <PenLine size={24} className="text-white" />
            </button>
          </div>

          <Link href="/wallet" className="flex flex-col items-center">
            <Wallet
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
