"use client";

import React from "react";
import { Trophy, Medal, Award, CheckCircle, XCircle } from "lucide-react";
import { ContributorStats } from "@/lib/constants";

interface LeaderboardTableProps {
  leaderboard: ContributorStats[];
  isLoading: boolean;
}

export function LeaderboardTable({ leaderboard, isLoading }: LeaderboardTableProps) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h3 className="font-bold text-white text-base">Contributor Leaderboard</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Ranked by On-Chain Reputation & Score
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Contributor</th>
              <th className="py-3 px-4 text-center">Approved</th>
              <th className="py-3 px-4 text-center">Revisions / Rejections</th>
              <th className="py-3 px-4 text-center">Avg Score</th>
              <th className="py-3 px-4 text-right">Total Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Loading on-chain leaderboard...
                </td>
              </tr>
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => {
                const truncated = `${entry.contributor.slice(0, 6)}...${entry.contributor.slice(-4)}`;
                return (
                  <tr
                    key={entry.contributor}
                    className="hover:bg-slate-800/40 transition-colors font-mono"
                  >
                    <td className="py-3.5 px-4 font-bold">
                      {index === 0 ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Medal className="h-4 w-4" /> #1
                        </span>
                      ) : index === 1 ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Medal className="h-4 w-4" /> #2
                        </span>
                      ) : index === 2 ? (
                        <span className="flex items-center gap-1 text-amber-700">
                          <Medal className="h-4 w-4" /> #3
                        </span>
                      ) : (
                        `#${index + 1}`
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      <span title={entry.contributor}>{truncated}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        {entry.approved_bounties}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {entry.rejected_bounties}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span
                        className={
                          entry.avg_score >= 80
                            ? "text-emerald-400"
                            : entry.avg_score >= 50
                            ? "text-amber-400"
                            : "text-slate-400"
                        }
                      >
                        {entry.avg_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {entry.total_earned} GEN
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No contributor records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
