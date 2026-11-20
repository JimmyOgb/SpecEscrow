"use client";

import React, { useState } from "react";
import { X, PlusCircle, AlertCircle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/lib/constants";

interface PostBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: string | null;
  onConnectWallet: () => void;
}

export function PostBountyModal({
  isOpen,
  onClose,
  onSuccess,
  account,
  onConnectWallet,
}: PostBountyModalProps) {
  const [title, setTitle] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [spec, setSpec] = useState("");
  const [rubric, setRubric] = useState("");
  const [reward, setReward] = useState("500");
  const [days, setDays] = useState("7");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      onConnectWallet();
      return;
    }

    if (!title.trim() || !spec.trim() || !rubric.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setTxHash(null);

      // Convert days to deadline timestamp
      const deadlineTs = Math.floor(Date.now() / 1000) + Number(days) * 86400;
      const rewardAmount = Math.max(1, parseInt(reward) || 100);

      const response = await fetch("/api/contract/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionName: "create_bounty",
          args: [
            title.trim(),
            repoUrl.trim() || "https://github.com/JimmyOgb/SpecEscrow",
            spec.trim(),
            rubric.trim(),
            rewardAmount,
            deadlineTs,
          ],
          sender: account,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Transaction submission failed.");
      }

      setTxHash(data.txHash);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to post bounty on-chain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Create On-Chain Bounty</h2>
            <p className="text-xs text-slate-400">
              Escrow funds on GenLayer StudioNet with rubric-driven adjudication
            </p>
          </div>
        </div>

        {/* Success Confirmation */}
        {txHash && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <div className="flex items-center gap-2 font-medium text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Bounty Created on GenLayer StudioNet!</span>
            </div>
            <p className="text-xs text-slate-400 font-mono break-all mb-2">
              Tx: {txHash}
            </p>
            <p className="text-xs text-emerald-400">
              The Intelligent Contract is updating state... Refreshing board shortly.
            </p>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bounty Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Implement EIP-1193 Provider Wrapper for StudioNet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Repository URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Specification / Deliverable Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the exact deliverable expected from the contributor..."
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Structured Acceptance Rubric (Evaluated by LLM Consensus) *
            </label>
            <textarea
              required
              rows={3}
              placeholder="List explicit criteria the Intelligent Contract must verify (e.g., zero errors, methods implemented, test coverage)..."
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reward Amount (GEN)
              </label>
              <input
                type="number"
                min="1"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isSubmitting ? "Broadcasting on StudioNet..." : "Deploy Bounty"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
