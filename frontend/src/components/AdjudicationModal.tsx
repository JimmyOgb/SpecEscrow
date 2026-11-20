"use client";

import React, { useState } from "react";
import {
  X,
  Shield,
  GitPullRequest,
  ExternalLink,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  UserCheck,
} from "lucide-react";
import { Bounty, CONTRACT_ADDRESS } from "@/lib/constants";

interface AdjudicationModalProps {
  bounty: Bounty | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  account: string | null;
  onConnectWallet: () => void;
}

export function AdjudicationModal({
  bounty,
  isOpen,
  onClose,
  onRefresh,
  account,
  onConnectWallet,
}: AdjudicationModalProps) {
  const [prUrl, setPrUrl] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen || !bounty) return null;

  const isContributor =
    account &&
    bounty.contributor &&
    bounty.contributor.toLowerCase() === account.toLowerCase();

  const isClaimedByOther =
    bounty.contributor &&
    bounty.contributor !== "0x0000000000000000000000000000000000000000" &&
    (!account || bounty.contributor.toLowerCase() !== account.toLowerCase());

  // Execute on-chain action
  const handleAction = async (functionName: string, args: any[]) => {
    if (!account) {
      onConnectWallet();
      return;
    }

    try {
      setIsActing(true);
      setActionError(null);
      setActionSuccess(null);

      const response = await fetch("/api/contract/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionName,
          args,
          sender: account,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Failed to execute ${functionName}`);
      }

      setActionSuccess(`Transaction broadcast: ${data.txHash}`);
      setTimeout(() => {
        onRefresh();
      }, 4000);
    } catch (err: any) {
      setActionError(err?.message || "Transaction failed.");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 mb-6 pr-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-sky-400">
                Bounty #{bounty.bounty_id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {bounty.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{bounty.title}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-mono">Escrow Reward</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {bounty.reward_amount} GEN
            </span>
          </div>
        </div>

        {/* Alerts */}
        {actionSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="break-all font-mono">{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Core Content */}
        <div className="space-y-4 text-xs">
          {/* Spec */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Specification
            </span>
            <p className="text-slate-200 leading-relaxed">{bounty.spec}</p>
          </div>

          {/* Rubric */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Acceptance Rubric
            </span>
            <p className="text-slate-300 leading-relaxed italic">
              &ldquo;{bounty.acceptance_rubric}&rdquo;
            </p>
          </div>

          {/* Live Adjudication Consensus Outcome (if evaluated) */}
          {(bounty.status === "APPROVED" ||
            bounty.status === "REVISION_NEEDED" ||
            bounty.status === "REJECTED") && (
            <div
              className={`p-4 rounded-xl border ${
                bounty.verdict === "APPROVED"
                  ? "bg-emerald-950/30 border-emerald-500/40"
                  : bounty.verdict === "REVISION_NEEDED"
                  ? "bg-orange-950/30 border-orange-500/40"
                  : "bg-rose-950/30 border-rose-500/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {bounty.verdict === "APPROVED" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : bounty.verdict === "REVISION_NEEDED" ? (
                    <RefreshCw className="h-5 w-5 text-orange-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-400" />
                  )}
                  <span>
                    Consensus Verdict: {bounty.verdict} (Score: {bounty.score}/100)
                  </span>
                </div>
              </div>

              {bounty.reasoning && (
                <div className="mb-3">
                  <span className="font-semibold text-slate-400 block mb-0.5">
                    Consensus Reasoning:
                  </span>
                  <p className="text-slate-200">{bounty.reasoning}</p>
                </div>
              )}

              {bounty.missing_criteria && bounty.missing_criteria.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-400 block mb-1">
                    Missing Criteria:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    {bounty.missing_criteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block">Sponsor:</span>
              <span className="text-slate-300 break-all">{bounty.sponsor}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contributor:</span>
              <span className="text-slate-300 break-all">
                {bounty.contributor === "0x0000000000000000000000000000000000000000"
                  ? "Unclaimed"
                  : bounty.contributor}
              </span>
            </div>
            {bounty.pr_url && (
              <div className="col-span-2">
                <span className="text-slate-500 block">Submitted Deliverable URL:</span>
                <a
                  href={bounty.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline break-all inline-flex items-center gap-1"
                >
                  <span>{bounty.pr_url}</span>
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {/* 1. Claim Bounty */}
            {bounty.status === "OPEN" && (
              <button
                onClick={() => handleAction("claim_bounty", [bounty.bounty_id])}
                disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {isActing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                <span>Claim Bounty</span>
              </button>
            )}

            {/* 2. Submit PR / Deliverable */}
            {(bounty.status === "CLAIMED" || bounty.status === "REVISION_NEEDED") && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Public deliverable / raw / diff URL..."
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-64"
                />
                <button
                  onClick={() => {
                    if (!prUrl.trim()) {
                      setActionError("Please provide a deliverable URL.");
                      return;
                    }
                    handleAction("submit_pr", [bounty.bounty_id, prUrl.trim()]);
                  }}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {isActing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <GitPullRequest className="h-3.5 w-3.5" />
                  )}
                  <span>Submit Deliverable</span>
                </button>
              </div>
            )}

            {/* 3. Adjudicate PR */}
            {bounty.status === "SUBMITTED" && (
              <button
                onClick={() => handleAction("adjudicate_pr", [bounty.bounty_id])}
                disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isActing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Award className="h-3.5 w-3.5" />
                )}
                <span>Run Consensus Adjudication</span>
              </button>
            )}

            {/* 4. Expire and Refund */}
            {(bounty.status === "OPEN" ||
              bounty.status === "CLAIMED" ||
              bounty.status === "REVISION_NEEDED") &&
              Date.now() / 1000 > bounty.deadline_ts && (
                <button
                  onClick={() =>
                    handleAction("expire_and_refund", [bounty.bounty_id])
                  }
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {isActing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Expire & Refund</span>
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
