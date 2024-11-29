"use client";

import dynamic from "next/dynamic";

const WritingGame = dynamic(() => import("~/components/WritingGame"), {
  ssr: false,
});

export default function App() {
  return <WritingGame />;
}
