import { createConfig, http, WagmiProvider } from "wagmi";
import { degen } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { defineChain } from "viem";

const DEGEN_ALCHEMY_RPC =
  process.env.DEGEN_ALCHEMY_RPC ||
  process.env.NEXT_PUBLIC_DEGEN_ALCHEMY_RPC ||
  "";

const degenChain = defineChain({
  id: 666666666,
  name: "Degen",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [DEGEN_ALCHEMY_RPC],
      //webSocket: ['wss://rpc.degen.tips'],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "explorer.degen.tips" },
  },
});

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
