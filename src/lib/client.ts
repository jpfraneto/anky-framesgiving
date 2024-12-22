import { createWalletClient, custom } from "viem";
import { degen } from "viem/chains";

export const walletClient = createWalletClient({
  chain: degen,
  transport: custom(window.ethereum!),
});
