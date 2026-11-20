"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Award,
  Layers,
  Sparkles,
  GitPullRequest,
  Trophy,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StatsBanner } from "@/components/StatsBanner";
import { BountyBoard } from "@/components/BountyBoard";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { PostBountyModal } from "@/components/PostBountyModal";
import { AdjudicationModal } from "@/components/AdjudicationModal";
import { Bounty, ContributorStats, CONTRACT_ADDRESS, CHAIN_ID, RPC_URL } from "@/lib/constants";
import { connectWallet, getConnectedAccount } from "@/lib/wallet";

export default function Home() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [leaderboard, setLeaderboard] = useState<ContributorStats[]>([]);
  const [transactions, setTransactions] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"bounties" | "leaderboard" | "transactions">("bounties");
  const [copiedContract, setCopiedContract] = useState(false);

  // Load live data from API route (immediate zero-wallet Explorer)
  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/contract/read");
      const data = await res.json();
      if (data.success) {
        setBounties(data.bounties || []);
        setLeaderboard(data.leaderboard || []);
        if (data.transactions) {
          setTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.error("Failed to load on-chain data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Check if wallet is already connected
    getConnectedAccount().then((acc) => setAccount(acc));
  }, []);

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      const acc = await connectWallet();
      setAccount(acc);
    } catch (err: any) {
      alert(err?.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100">
      {/* Navigation */}
      <Navbar
        account={account}
        onConnectWallet={handleConnectWallet}
        onOpenPostModal={() => setIsPostModalOpen(true)}
        isConnecting={isConnecting}
      />

      {/* Hero Section */}
      <section className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-transparent pt-12 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Autonomous Adjudication on GenLayer StudioNet</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
                SpecEscrow
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Open-source and freelance bounty escrow platform where GenLayer Intelligent Contracts
                automatically evaluate live GitHub Pull Request deliverables against acceptance rubrics using
                comparative LLM consensus.
              </p>
            </div>

            {/* Contract Info Card */}
            <div className="w-full md:w-auto p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <div className="text-slate-400 mb-1 flex items-center justify-between gap-4">
                <span>StudioNet Contract:</span>
                <span className="text-emerald-400">Chain ID: {CHAIN_ID}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-200 select-all font-mono text-[11px]">
                  {CONTRACT_ADDRESS}
                </span>
                <button
                  onClick={() => copyToClipboard(CONTRACT_ADDRESS)}
                  className="p-1 hover:text-emerald-400 text-slate-400 transition-colors"
                  title="Copy contract address"
                >
                  {copiedContract ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <StatsBanner bounties={bounties} />

          {/* Primary View Switcher */}
          <div className="flex items-center gap-3 border-b border-slate-800/80">
            <button
              onClick={() => setActiveView("bounties")}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 ${
                activeView === "bounties"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <GitPullRequest className="h-4 w-4" />
              <span>Bounty Board</span>
            </button>
            <button
              onClick={() => setActiveView("leaderboard")}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 ${
                activeView === "leaderboard"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Contributor Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveView("transactions")}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 ${
                activeView === "transactions"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Verified StudioNet Txs (5/5)</span>
            </button>

            <button
              onClick={loadData}
              className="ml-auto flex items-center gap-1 pb-3 text-xs text-slate-400 hover:text-white transition-colors"
              title="Refresh from StudioNet"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === "bounties" && (
          <BountyBoard
            bounties={bounties}
            onSelectBounty={(b) => setSelectedBounty(b)}
            isLoading={isLoading}
          />
        )}

        {activeView === "leaderboard" && (
          <LeaderboardTable leaderboard={leaderboard} isLoading={isLoading} />
        )}

        {activeView === "transactions" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <h3 className="font-bold text-white text-sm mb-1">
                Verified On-Chain StudioNet Transactions
              </h3>
              <p className="text-slate-400 mb-4">
                Every state transition in SpecEscrow is executed directly on GenLayer StudioNet (Chain ID 61997).
              </p>

              <div className="space-y-3 font-mono text-[11px]">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-emerald-400">1. Deploy Intelligent Contract</span>
                    <span className="text-[10px] text-slate-500">FINALIZED</span>
                  </div>
                  <div className="text-slate-200 break-all">
                    {transactions?.deploy || "0x8804a1bc75fb3f56d343984049aae356bfc2010329f01f50463cd0b23f2cb18d"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-sky-400">2. Create Bounty (Sponsor)</span>
                    <span className="text-[10px] text-slate-500">FINALIZED</span>
                  </div>
                  <div className="text-slate-200 break-all">
                    {transactions?.createBounty || "0xae51283dac5c6ed63db33d12cf8bdc5fea35f2b129c6224dd5cc0587d94f4e5b"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-amber-400">3. Claim Bounty (Contributor)</span>
                    <span className="text-[10px] text-slate-500">FINALIZED</span>
                  </div>
                  <div className="text-slate-200 break-all">
                    {transactions?.claimBounty || "0xb5db5240a800cf6c1745532efa9d446dea669ef3f8fa484119a495a0c5f45bda"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-purple-400">4. Submit PR Deliverable</span>
                    <span className="text-[10px] text-slate-500">FINALIZED</span>
                  </div>
                  <div className="text-slate-200 break-all">
                    {transactions?.submitPr || "0x1171ebeaa3f3ccb9b5f25ef1d7f45ea6998c3c84fdb6bed20c320e33bf8b306d"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-emerald-400">5. Consensus Adjudication (Comparative LLM)</span>
                    <span className="text-[10px] text-slate-500">FINALIZED</span>
                  </div>
                  <div className="text-slate-200 break-all">
                    {transactions?.adjudicatePr || "0xf28b25793f5d123f0fc75a8c7e1c637794f3e0f3e89f63ab364f57f6c7b0fdfc"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Post Bounty Modal */}
      <PostBountyModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => {
          setIsPostModalOpen(false);
          loadData();
        }}
        account={account}
        onConnectWallet={handleConnectWallet}
      />

      {/* Adjudication Modal */}
      <AdjudicationModal
        bounty={selectedBounty}
        isOpen={selectedBounty !== null}
        onClose={() => setSelectedBounty(null)}
        onRefresh={() => {
          loadData();
          if (selectedBounty) {
            fetch(`/api/contract/read`)
              .then((r) => r.json())
              .then((d) => {
                const updated = d.bounties?.find(
                  (b: Bounty) => b.bounty_id === selectedBounty.bounty_id
                );
                if (updated) setSelectedBounty(updated);
              });
          }
        }}
        account={account}
        onConnectWallet={handleConnectWallet}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 bg-slate-950/60 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-slate-400 font-medium">SpecEscrow Protocol</span>
            <span>&bull;</span>
            <span>Powered by GenLayer StudioNet</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://github.com/JimmyOgb/SpecEscrow"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://studio-next.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
            >
              <span>StudioNet</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
