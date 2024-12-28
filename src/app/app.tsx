"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const prompt = params.get("prompt");

  useEffect(() => {
    router.push(`/profile?prompt=${prompt}`);
  }, [router]);

  // Keep a minimal return while redirecting
  return <div className="h-full w-full"></div>;
}
