function LifeBar({ timeLeft }: { timeLeft: number }) {
  return (
    <div
      className="h-2 bg-blue-500 mb-2 rounded-xl transition-all duration-500 ease-in-out"
      style={{
        width: `${(timeLeft / 8000) * 100}%`,
        opacity: timeLeft > 5000 ? 0 : 1,
        boxShadow:
          timeLeft <= 5000 ? "0 0 8px rgba(59, 130, 246, 0.6)" : "none",
        transform: `scale(${timeLeft <= 5000 ? "1" : "0.98"})`,
      }}
    />
  );
}

export default LifeBar;
