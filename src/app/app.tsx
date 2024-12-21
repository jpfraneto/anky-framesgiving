"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/profile");
  }, [router]);

  // Keep a minimal return while redirecting
  return <div className="h-full w-full"></div>;
}
