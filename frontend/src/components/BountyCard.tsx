"use client";

import React from "react";
import { ExternalLink, Clock, DollarSign, User, FileText, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Bounty } from "@/lib/constants";

interface BountyCardProps {
  bounty: Bounty;
  onSelect: (bounty: Bounty) => void;
}

export function BountyCard({ bounty, onSelect }: BountyCardProps) {
  const getStatusBadge = (status: Bounty["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            OPEN
          </span>
        );
      case "CLAIMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            CLAIMED
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            SUBMITTED
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            APPROVED ({bounty.score}/100)
          </span>
        );
      case "REVISION_NEEDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <RefreshCw className="h-3 w-3 text-orange-400" />
            REVISION NEEDED ({bounty.score}/100)
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="h-3 w-3 text-rose-400" />
            REJECTED
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
            EXPIRED
          </span>
        );
      default:
        return null;
    }
  };

  const deadlineFormatted = new Date(bounty.deadline_ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isExpired = Date.now() / 1000 > bounty.deadline_ts;

  return (
    <div className="flex flex-col justify-between p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-slate-950/50">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 font-semibold">
              #{bounty.bounty_id}
            </span>
            {getStatusBadge(bounty.status)}
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-sm bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span>{bounty.reward_amount}</span>
            <span className="text-xs text-emerald-300">GEN</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white text-base mb-2 line-clamp-1 hover:text-sky-300 transition-colors">
          {bounty.title}
        </h3>

        {/* Repo */}
        {bounty.repo_url && (
          <a
            href={bounty.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400 font-mono mb-3 transition-colors"
          >
            <span>{bounty.repo_url.replace("https://github.com/", "")}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Spec snippet */}
        <p className="text-xs text-slate-300 line-clamp-2 mb-3">
          {bounty.spec}
        </p>

        {/* Rubric snippet */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-4 text-xs">
          <div className="flex items-center gap-1 text-slate-400 font-medium mb-1">
            <FileText className="h-3 w-3 text-sky-400" />
            <span>Acceptance Rubric:</span>
          </div>
          <p className="text-slate-300 line-clamp-2 italic">
            &ldquo;{bounty.acceptance_rubric}&rdquo;
          </p>
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{isExpired ? "Expired" : `Due ${deadlineFormatted}`}</span>
        </div>

        <button
          onClick={() => onSelect(bounty)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-all"
        >
          View Console &rarr;
        </button>
      </div>
    </div>
  );
}
