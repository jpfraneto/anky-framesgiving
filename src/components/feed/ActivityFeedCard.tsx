import { motion } from "framer-motion";
import { FeedSession } from "../../app/(phone)/feed/page";
import Image from "next/image";
import Link from "next/link";

function ActivityFeedCard({ session }: { session: FeedSession }) {
  const durationInSeconds = session.endTime
    ? parseInt(session.endTime) - parseInt(session.startTime)
    : 0;
  return (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-purple-800/30 py-6 px-4 rounded-xl mb-4 bg-gradient-to-br from-purple-900/40 via-orange-900/20 to-yellow-900/30 backdrop-blur-sm hover:from-purple-800/40 hover:via-orange-800/20 hover:to-yellow-800/30 transition-all duration-500 flex items-center justify-start gap-4"
    >
      <div className="rounded-full overflow-hidden flex-shrink-0">
        <Image
          src={session.farcasterUser.pfpUrl}
          alt={session.farcasterUser.displayName}
          width={60}
          height={60}
          className="rounded-full"
        />
      </div>
      <div>
        {session.farcasterUser.displayName} wrote{" "}
        {session.isAnky ? "an anky" : `for ${durationInSeconds} seconds`}{" "}
        <span className="text-purple-400">
          {(() => {
            const now = Date.now();
            const timestamp = parseInt(session.startTime) * 1000;
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (diff < 60000) return "a few seconds ago";
            if (minutes === 1) return "1 minute ago";
            if (minutes < 60) return `${minutes} minutes ago`;
            if (hours === 1) return "1 hour ago";
            if (hours < 24) return `${hours} hours ago`;
            if (days === 1) return "1 day ago";
            return `${days} days ago`;
          })()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/session/${session.ipfsHash}`}>Read Session</Link>
        {session.isAnky && session.ankyToken && (
          <Link
            href={`/ankys/${session?.ankyToken?.id}?metadataIpfsHash=${session.ankyToken.metadataIpfsHash}&tokenId=${session.ankyToken.id}`}
          >
            Anky
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default ActivityFeedCard;
