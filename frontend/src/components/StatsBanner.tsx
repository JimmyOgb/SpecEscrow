"use client";

import React from "react";
import { Coins, GitPullRequest, Award, Shield, ExternalLink } from "lucide-react";
import { Bounty, CONTRACT_ADDRESS } from "@/lib/constants";

interface StatsBannerProps {
  bounties: Bounty[];
}

export function StatsBanner({ bounties }: StatsBannerProps) {
  const totalBounties = bounties.length;
  const activeBounties = bounties.filter(
    (b) => b.status === "OPEN" || b.status === "CLAIMED" || b.status === "SUBMITTED"
  ).length;
  const settledBounties = bounties.filter(
    (b) => b.status === "APPROVED" || b.status === "REVISION_NEEDED" || b.status === "REJECTED" || b.status === "EXPIRED"
  ).length;
  const totalReward = bounties.reduce((sum, b) => sum + Number(b.reward_amount || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Stat 1 */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-1 font-mono">
          <GitPullRequest className="h-4 w-4 text-sky-400" />
          <span>Total Bounties</span>
        </div>
        <div className="text-2xl font-bold text-white">{totalBounties}</div>
        <div className="text-xs text-slate-400 mt-1">Live on StudioNet</div>
      </div>

      {/* Stat 2 */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-1 font-mono">
          <Shield className="h-4 w-4 text-amber-400" />
          <span>In Progress</span>
        </div>
        <div className="text-2xl font-bold text-white">{activeBounties}</div>
        <div className="text-xs text-slate-400 mt-1">Claimed or Submitted</div>
      </div>

      {/* Stat 3 */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-1 font-mono">
          <Award className="h-4 w-4 text-emerald-400" />
          <span>Settled & Reviewed</span>
        </div>
        <div className="text-2xl font-bold text-white">{settledBounties}</div>
        <div className="text-xs text-slate-400 mt-1">Consensus Adjudicated</div>
      </div>

      {/* Stat 4 */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-1 font-mono">
          <Coins className="h-4 w-4 text-indigo-400" />
          <span>Total Escrowed</span>
        </div>
        <div className="text-2xl font-bold text-white">{totalReward} <span className="text-sm font-normal text-slate-400">GEN</span></div>
        <div className="text-xs text-slate-400 mt-1">Escrowed Rewards</div>
      </div>
    </div>
  );
}
