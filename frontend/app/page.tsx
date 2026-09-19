"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/lib/genlayer/wallet";
import { useLatest, useHistory, useSupportedSymbols, useCheck } from "@/lib/hooks/useCorroborate";
import { getTxExplorerUrl } from "@/lib/genlayer/chains";
import type { PriceCheck } from "@/lib/contracts/types";

const FALLBACK_SYMBOLS = ["ETH", "BTC", "SOL"];
const TOLERANCE_BPS = 150;

function useNowSeconds() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function timeAgo(checkedAt: string, nowSeconds: number): string {
  const from = parseInt(checkedAt, 10) || 0;
  const diff = Math.max(0, nowSeconds - from);
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatUsd(micros: string): string {
  const value = parseInt(micros, 10) / 1_000_000;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function beamTiltDeg(record: PriceCheck | null | undefined): number {
  if (!record) return 0;
  const a = parseInt(record.source_a_price_micros, 10);
  const b = parseInt(record.source_b_price_micros, 10);
  const bps = parseInt(record.deviation_bps, 10) || 0;
  const magnitude = Math.min(8, bps / 20);
  return b >= a ? magnitude : -magnitude;
}

export default function HomePage() {
  const { isConnected } = useWallet();
  const now = useNowSeconds();

  const { data: symbols } = useSupportedSymbols();
  const tabs = symbols && symbols.length > 0 ? symbols : FALLBACK_SYMBOLS;

  const [selected, setSelected] = useState("ETH");
  const { data: latest, isLoading: latestLoading } = useLatest(selected);
  const { data: history, isLoading: historyLoading } = useHistory();
  const { check, isChecking, pendingTxHash, clearPendingTx } = useCheck();

  const tilt = useMemo(() => beamTiltDeg(latest), [latest]);
  const recentHistory = useMemo(() => (history ?? []).slice().reverse().slice(0, 12), [history]);

  const handleCheck = () => {
    clearPendingTx();
    check(selected);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-5 md:px-7">
          {/* ---------- Hero: the scale ---------- */}
          <section className="rounded-2xl border border-border bg-card px-6 py-9 text-center">
            <div className="eyebrow">Cross-Source Price Check</div>

            <svg className="scale-svg mt-4" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
              <line x1="200" y1="30" x2="200" y2="150" stroke="var(--muted-foreground)" strokeWidth="3" />
              <polygon points="180,150 220,150 210,175 190,175" fill="var(--secondary)" stroke="var(--border)" strokeWidth="1.5" />
              <circle cx="200" cy="30" r="5" fill="var(--primary)" />

              <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "200px 30px", transition: "transform 0.6s ease" }}>
                <line x1="60" y1="30" x2="340" y2="30" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />

                <line x1="60" y1="30" x2="60" y2="72" stroke="var(--muted-foreground)" strokeWidth="1.3" />
                <line x1="40" y1="72" x2="80" y2="72" stroke="var(--muted-foreground)" strokeWidth="1.3" />
                <path d="M35 72 Q60 95 85 72" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" />
                <text x="60" y="118" textAnchor="middle" className="pan-label">COINGECKO</text>
                <text x="60" y="136" textAnchor="middle" className="pan-price tabular">
                  {latest ? formatUsd(latest.source_a_price_micros) : "—"}
                </text>

                <line x1="340" y1="30" x2="340" y2="80" stroke="var(--muted-foreground)" strokeWidth="1.3" />
                <line x1="320" y1="80" x2="360" y2="80" stroke="var(--muted-foreground)" strokeWidth="1.3" />
                <path d="M315 80 Q340 103 365 80" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" />
                <text x="340" y="126" textAnchor="middle" className="pan-label">COINBASE</text>
                <text x="340" y="144" textAnchor="middle" className="pan-price tabular">
                  {latest ? formatUsd(latest.source_b_price_micros) : "—"}
                </text>
              </g>

              <text x="200" y="205" textAnchor="middle" className="pan-label" style={{ letterSpacing: "0.1em" }}>
                {selected} · USD
              </text>
            </svg>

            <div className="mt-5">
              {latestLoading ? (
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : latest ? (
                <>
                  <span className={`verdict-badge ${latest.corroborated ? "ok" : "bad"}`}>
                    <span className="verdict-dot" />
                    {latest.corroborated ? "CORROBORATED" : "DIVERGED"}
                  </span>
                  <div className="mt-2.5 font-mono text-[0.72rem] text-muted-foreground">
                    Deviation <b className="text-foreground tabular">{latest.deviation_bps} bps</b>
                    {" "}({(parseInt(latest.deviation_bps, 10) / 100).toFixed(2)}%) · within the{" "}
                    <b className="text-foreground">{TOLERANCE_BPS} bps</b> tolerance is corroborated
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No check recorded yet for {selected} - run one below.</p>
              )}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleCheck}
                disabled={!isConnected || isChecking}
                className="font-semibold text-[0.86rem] text-primary-foreground bg-primary rounded-lg px-5 py-2.5 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isChecking ? (<><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>) : "Check Now →"}
              </button>
              {!isConnected && (
                <p className="mt-2 text-xs text-muted-foreground">Connect a wallet above to run a live check.</p>
              )}
              {isChecking && (
                <div className="mt-2.5 font-mono text-xs text-muted-foreground">
                  {pendingTxHash ? (
                    <>
                      Transaction submitted -{" "}
                      <a href={getTxExplorerUrl(pendingTxHash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        view on explorer
                      </a>
                    </>
                  ) : (
                    "Preparing transaction..."
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ---------- Asset tabs ---------- */}
          <div className="mt-8 flex gap-2">
            {tabs.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setSelected(sym)}
                className={`font-mono text-[0.78rem] font-semibold px-4 py-2 rounded-lg border transition-colors ${
                  selected === sym
                    ? "text-foreground border-primary bg-secondary"
                    : "text-muted-foreground border-border bg-card hover:border-primary/40"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* ---------- How it verifies ---------- */}
          <div className="mt-7 grid sm:grid-cols-3 gap-3">
            <div className="rounded-[10px] border border-border bg-card p-3.5">
              <div className="font-mono text-[0.7rem] text-primary">01</div>
              <h3 className="mt-1.5 text-[0.86rem] font-semibold">Fetch both, independently</h3>
              <p className="mt-1 text-[0.76rem] text-muted-foreground leading-relaxed">
                Validators call CoinGecko and Coinbase directly - no LLM, plain JSON, deterministic parsing.
              </p>
            </div>
            <div className="rounded-[10px] border border-border bg-card p-3.5">
              <div className="font-mono text-[0.7rem] text-primary">02</div>
              <h3 className="mt-1.5 text-[0.86rem] font-semibold">Measure deviation</h3>
              <p className="mt-1 text-[0.76rem] text-muted-foreground leading-relaxed">
                Basis-point difference between the two, relative to the larger price.
              </p>
            </div>
            <div className="rounded-[10px] border border-border bg-card p-3.5">
              <div className="font-mono text-[0.7rem] text-primary">03</div>
              <h3 className="mt-1.5 text-[0.86rem] font-semibold">Agree on the verdict</h3>
              <p className="mt-1 text-[0.76rem] text-muted-foreground leading-relaxed">
                Only corroborated/diverged is consensus-critical - the raw prices are informational.
              </p>
            </div>
          </div>

          {/* ---------- Printout log ---------- */}
          <div className="mt-9 flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-[1.02rem] font-bold">The Log</h2>
            <span className="eyebrow">{history?.length ?? 0} checks recorded</span>
          </div>

          {historyLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading the log...
            </div>
          ) : recentHistory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No checks yet - be the first to run one above.</p>
          ) : (
            <div className="mt-4 printout bg-card border border-border rounded-[4px]">
              {recentHistory.map((entry, i) => (
                <div
                  key={`${entry.symbol}-${entry.checked_at}-${i}`}
                  className="px-5 py-3.5 grid grid-cols-[1fr_auto] gap-x-3.5 gap-y-1.5 items-baseline"
                  style={{ borderBottom: i === recentHistory.length - 1 ? "none" : "1px dashed var(--border-soft)" }}
                >
                  <span className="font-mono font-bold text-[0.82rem]">{entry.symbol}</span>
                  <span className="font-mono text-[0.66rem]" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                    {timeAgo(entry.checked_at, now)}
                  </span>
                  <span className="col-span-2 font-mono text-[0.74rem] text-muted-foreground tabular">
                    CoinGecko {formatUsd(entry.source_a_price_micros)} · Coinbase {formatUsd(entry.source_b_price_micros)} · {entry.deviation_bps} bps
                  </span>
                  <span className={`entry-verdict ${entry.corroborated ? "ok" : "bad"} col-start-2 row-start-1 font-mono text-[0.7rem] font-bold text-right`} style={{ letterSpacing: "0.03em" }}>
                    {entry.corroborated ? "✓ CORROBORATED" : "⚠ DIVERGED"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-5">
        <div className="max-w-3xl mx-auto px-5 md:px-7 flex items-center justify-between flex-wrap gap-3 font-mono text-xs text-muted-foreground">
          <span>GenLayer Bradbury Testnet</span>
          <div className="flex items-center gap-5">
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              GenLayer
            </a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Docs
            </a>
            <a href="https://github.com/2TheMoom/corroborate" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
