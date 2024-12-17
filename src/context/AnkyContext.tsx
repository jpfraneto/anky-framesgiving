"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AnkyContextType {
  isUserWriting: boolean;
  setIsUserWriting: (isWriting: boolean) => void;
  isWritingGameVisible: boolean;
  setIsWritingGameVisible: (isWriting: boolean) => void;
}

const AnkyContext = createContext<AnkyContextType | undefined>(undefined);

export function AnkyProvider({ children }: { children: ReactNode }) {
  const [isUserWriting, setIsUserWriting] = useState(false);
  const [isWritingGameVisible, setIsWritingGameVisible] = useState(true);
  const value = {
    isUserWriting,
    setIsUserWriting,
    isWritingGameVisible,
    setIsWritingGameVisible,
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
