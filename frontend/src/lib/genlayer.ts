import { createClient } from "genlayer-js";
import { RPC_URL, CONTRACT_ADDRESS, Bounty, ContributorStats } from "./constants";

export const studioNetChain = {
  id: 61997,
  name: "GenLayer StudioNet",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "GenLayer Studio",
      url: "https://studio-next.genlayer.com",
    },
  },
} as const;

export function getGenLayerClient() {
  return createClient({
    chain: studioNetChain,
  });
}

export async function fetchAllBounties(): Promise<Bounty[]> {
  try {
    const client = getGenLayerClient();
    const result = (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_all_bounties",
      args: [],
    })) as unknown as Bounty[];
    return result || [];
  } catch (error) {
    console.warn("Client readContract error, falling back to direct RPC", error);
    return [];
  }
}

export async function fetchBounty(bountyId: number): Promise<Bounty | null> {
  try {
    const client = getGenLayerClient();
    const result = (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_bounty",
      args: [bountyId],
    })) as unknown as Bounty;
    return result || null;
  } catch (error) {
    console.error("fetchBounty error:", error);
    return null;
  }
}

export async function fetchLeaderboard(): Promise<ContributorStats[]> {
  try {
    const client = getGenLayerClient();
    const result = (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_leaderboard",
      args: [],
    })) as unknown as ContributorStats[];
    return result || [];
  } catch (error) {
    console.error("fetchLeaderboard error:", error);
    return [];
  }
}

export async function fetchContributorStats(address: string): Promise<ContributorStats | null> {
  try {
    const client = getGenLayerClient();
    const result = (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_contributor_stats",
      args: [address],
    })) as unknown as ContributorStats;
    return result || null;
  } catch (error) {
    console.error("fetchContributorStats error:", error);
    return null;
  }
}
