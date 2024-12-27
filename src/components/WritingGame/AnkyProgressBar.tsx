import { useState, useEffect } from "react";

function AnkyProgressBar({
  sessionStartTime,
}: {
  sessionStartTime: number | null;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sessionStartTime) return;

    // Update progress every 100ms
    const interval = setInterval(() => {
      const elapsedTime = Date.now() - sessionStartTime;
      const progressPercent = Math.min(
        100,
        (elapsedTime / (8 * 60 * 1000)) * 100
      );
      setProgress(progressPercent);
    }, 100);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const isComplete = progress >= 100;

  return (
    <div
      className={`h-4 my-1 rounded-xl transition-all duration-100 relative overflow-hidden ${
        isComplete ? "animate-pulse" : ""
      }`}
      style={{
        width: `${progress}%`,
      }}
    >
      {isComplete ? (
        <>
          <div className="absolute inset-0 animate-slide-1 bg-gradient-to-r from-purple-600 via-yellow-400 to-orange-500" />
          <div className="absolute inset-0 animate-slide-2 bg-gradient-to-r from-orange-500 via-purple-600 to-yellow-400" />
          <div className="absolute inset-0 animate-slide-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600" />
          <div className="absolute inset-0 animate-shimmer bg-white/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-green-600" />
      )}
    </div>
  );
}

export default AnkyProgressBar;
