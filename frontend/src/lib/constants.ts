export const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio-next.genlayer.com/api";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "61997");
export const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x6a120cead2e3F7d6b988938969F40fe57676Ad4C") as `0x${string}`;

export const GENLAYER_CHAIN_CONFIG = {
  chainId: CHAIN_ID_HEX,
  chainName: "GenLayer StudioNet",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: ["https://studio-next.genlayer.com"],
};

export interface Bounty {
  bounty_id: number;
  sponsor: string;
  contributor: string;
  title: string;
  repo_url: string;
  spec: string;
  acceptance_rubric: string;
  reward_amount: number;
  deadline_ts: number;
  pr_url: string;
  status: "OPEN" | "CLAIMED" | "SUBMITTED" | "APPROVED" | "REVISION_NEEDED" | "REJECTED" | "EXPIRED";
  score: number;
  verdict: string;
  missing_criteria: string[];
  reasoning: string;
}

export interface ContributorStats {
  contributor: string;
  approved_bounties: number;
  rejected_bounties: number;
  total_score: number;
  avg_score: number;
  total_earned: number;
}
