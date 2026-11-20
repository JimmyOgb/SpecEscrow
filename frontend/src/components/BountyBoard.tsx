"use client";

import React, { useState } from "react";
import { Search, Filter, Sparkles } from "lucide-react";
import { Bounty } from "@/lib/constants";
import { BountyCard } from "./BountyCard";

interface BountyBoardProps {
  bounties: Bounty[];
  onSelectBounty: (bounty: Bounty) => void;
  isLoading: boolean;
}

type FilterTab = "ALL" | "OPEN" | "IN_PROGRESS" | "SETTLED";

export function BountyBoard({ bounties, onSelectBounty, isLoading }: BountyBoardProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBounties = bounties.filter((b) => {
    // Tab filter
    if (activeTab === "OPEN" && b.status !== "OPEN") return false;
    if (
      activeTab === "IN_PROGRESS" &&
      b.status !== "CLAIMED" &&
      b.status !== "SUBMITTED"
    )
      return false;
    if (
      activeTab === "SETTLED" &&
      b.status !== "APPROVED" &&
      b.status !== "REVISION_NEEDED" &&
      b.status !== "REJECTED" &&
      b.status !== "EXPIRED"
    )
      return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchSpec = b.spec.toLowerCase().includes(q);
      const matchRepo = b.repo_url.toLowerCase().includes(q);
      return matchTitle || matchSpec || matchRepo;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "ALL"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({bounties.length})
          </button>
          <button
            onClick={() => setActiveTab("OPEN")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "OPEN"
                ? "bg-slate-800 text-sky-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Open ({bounties.filter((b) => b.status === "OPEN").length})
          </button>
          <button
            onClick={() => setActiveTab("IN_PROGRESS")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "IN_PROGRESS"
                ? "bg-slate-800 text-amber-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            In Progress (
            {
              bounties.filter(
                (b) => b.status === "CLAIMED" || b.status === "SUBMITTED"
              ).length
            }
            )
          </button>
          <button
            onClick={() => setActiveTab("SETTLED")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "SETTLED"
                ? "bg-slate-800 text-emerald-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Settled (
            {
              bounties.filter(
                (b) =>
                  b.status === "APPROVED" ||
                  b.status === "REVISION_NEEDED" ||
                  b.status === "REJECTED" ||
                  b.status === "EXPIRED"
              ).length
            }
            )
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, repo, or specification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Bounty Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredBounties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBounties.map((bounty) => (
            <BountyCard
              key={bounty.bounty_id}
              bounty={bounty}
              onSelect={onSelectBounty}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800">
          <Sparkles className="h-8 w-8 text-slate-500 mx-auto mb-3" />
          <h4 className="text-base font-medium text-slate-300 mb-1">No bounties found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No bounties matched "${searchQuery}". Try a different keyword.`
              : "No bounties under this category yet. Be the first to post a new on-chain bounty!"}
          </p>
        </div>
      )}
    </div>
  );
}
