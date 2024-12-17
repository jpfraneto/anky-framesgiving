"use client";

// interface Writer {
//   username: string;
//   ankyCount: number;
//   avgFlowScore: number;
//   totalSessions: number;
//   rank: number;
// }

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Top Writers</h1>
      <p>what is your average flow score?</p>
      <p>how are you ranking?</p>
      {/* 
      <div className="space-y-4">
        {writers.map((writer) => (
          <div
            key={writer.username}
            className="bg-[#1a1f3d] rounded-lg p-4 border border-[#ff6b00]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-[#ff6b00]">
                  #{writer.rank}
                </span>
                <span className="text-lg">{writer.username}</span>
              </div>
              <div className="text-2xl font-bold text-[#ff6b00]">
                {writer.ankyCount} Ankys
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-400">
              <div>
                Flow Score:{" "}
                <span className="text-white">{writer.avgFlowScore}</span>
              </div>
              <div>
                Sessions:{" "}
                <span className="text-white">{writer.totalSessions}</span>
              </div>
            </div>
          </div>
        ))}
      </div> */}
    </div>
  );
}
