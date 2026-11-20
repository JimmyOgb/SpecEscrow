"use client";

import React from "react";
import { ShieldCheck, Wallet, PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { CONTRACT_ADDRESS, CHAIN_ID } from "@/lib/constants";

interface NavbarProps {
  account: string | null;
  onConnectWallet: () => void;
  onOpenPostModal: () => void;
  isConnecting: boolean;
}

export function Navbar({
  account,
  onConnectWallet,
  onOpenPostModal,
  isConnecting,
}: NavbarProps) {
  const truncatedAccount = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">SpecEscrow</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                StudioNet
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Consensus Adjudication for GitHub Pull Requests
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Network pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Chain ID: {CHAIN_ID}</span>
          </div>

          {/* Post Bounty Button */}
          <button
            onClick={onOpenPostModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-sm transition-all shadow-md shadow-emerald-500/20"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Post Bounty</span>
          </button>

          {/* Wallet Button */}
          <button
            onClick={onConnectWallet}
            disabled={isConnecting}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              account
                ? "bg-slate-900/90 text-slate-200 border-slate-700 hover:border-slate-600"
                : "bg-sky-500 hover:bg-sky-400 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>
              {isConnecting
                ? "Connecting..."
                : account
                ? truncatedAccount
                : "Connect Wallet"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
