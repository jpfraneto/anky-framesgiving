import { createConfig, http, WagmiProvider } from "wagmi";
import { degen } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

export const config = createConfig({
  chains: [degen],
  transports: {
    [degen.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_RPC ?? "https://rpc.degen.tips"
    ),
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
