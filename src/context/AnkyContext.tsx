"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { UserWritingStats } from "~/components/WritingGame";

interface AnkyContextType {
  isUserWriting: boolean;
  setIsUserWriting: (isWriting: boolean) => void;
  isWritingGameVisible: boolean;
  setIsWritingGameVisible: (isWriting: boolean) => void;
  userWritingContext: UserWritingStats | null;
  setUserWritingContext: (context: UserWritingStats | null) => void;
}

const AnkyContext = createContext<AnkyContextType | undefined>(undefined);

export function AnkyProvider({ children }: { children: ReactNode }) {
  const [isUserWriting, setIsUserWriting] = useState(false);
  const [userWritingContext, setUserWritingContext] =
    useState<UserWritingStats | null>(null);
  const [isWritingGameVisible, setIsWritingGameVisible] = useState(true);
  const value = {
    isUserWriting,
    setIsUserWriting,
    isWritingGameVisible,
    setIsWritingGameVisible,
    userWritingContext,
    setUserWritingContext,
  };

  return <AnkyContext.Provider value={value}>{children}</AnkyContext.Provider>;
}

export function useAnky() {
  const context = useContext(AnkyContext);
  if (context === undefined) {
    throw new Error("useAnky must be used within an AnkyProvider");
  }
  return context;
}
