import { createConfig, http, WagmiProvider } from "wagmi";
import { Chain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
// Define Degen Chain
export const degenChain = {
  id: 666666666,
  name: "Degen Chain",
  nativeCurrency: {
    decimals: 18,
    name: "DEGEN",
    symbol: "DEGEN",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.degen.tips"],
    },
    public: {
      http: ["https://rpc.degen.tips"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.degen.tips" },
  },
} as const satisfies Chain;

export const config = createConfig({
  chains: [degenChain],
  transports: {
    [degenChain.id]: http(),
  },
  connectors: [farcasterFrame()],
});

const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
