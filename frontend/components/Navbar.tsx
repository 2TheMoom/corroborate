"use client";

import { AccountPanel } from "./AccountPanel";
import { LogoFull } from "./Logo";
import { GENLAYER_CHAIN_ID, GENLAYER_NETWORK } from "@/lib/genlayer/client";

// "GenLayer Bradbury Testnet" -> "Bradbury" for the compact badge below.
const NETWORK_SHORT_NAME = GENLAYER_NETWORK.chainName
  .replace(/^GenLayer\s+/i, "")
  .replace(/\s+Testnet$/i, "");

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border backdrop-blur">
      <div className="max-w-3xl mx-auto px-5 md:px-7">
        <div className="flex items-center justify-between h-16">
          <LogoFull size="sm" />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-muted-foreground border border-border rounded-full px-2.5 py-1.5 bg-muted/40">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {NETWORK_SHORT_NAME} · {GENLAYER_CHAIN_ID}
            </div>
            <AccountPanel />
          </div>
        </div>
      </div>
    </header>
  );
}
