"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http } from "wagmi";
import { polygonAmoy, polygon } from "wagmi/chains";

const queryClient = new QueryClient();

const chainName = process.env.NEXT_PUBLIC_WAGMI_CHAIN?.toLowerCase();
const selectedChain = chainName === "mainnet" ? polygon : polygonAmoy;

const config = getDefaultConfig({
  appName: "CrimeFiles",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
  chains: [selectedChain],
  ssr: true,
  transports: {
    [selectedChain.id]: http(),
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
