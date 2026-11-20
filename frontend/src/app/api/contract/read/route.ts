import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { CONTRACT_ADDRESS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Load deployment snapshot as verified base
    let deploymentData: any = null;
    const deploymentPath = path.join(process.cwd(), "..", "artifacts", "deployment.json");
    const localDeploymentPath = path.join(process.cwd(), "artifacts", "deployment.json");

    if (fs.existsSync(deploymentPath)) {
      deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
    } else if (fs.existsSync(localDeploymentPath)) {
      deploymentData = JSON.parse(fs.readFileSync(localDeploymentPath, "utf-8"));
    }

    // Default bounties if file not found
    let bounties = deploymentData?.allBounties || [
      {
        bounty_id: 1,
        sponsor: "0xE4220c4b71877bb94EB173f467ef5c5557017085",
        contributor: "0xa5bC3717D6b516C82446441Fb2d492d11a52816d",
        title: "Implement EIP-1193 Provider Wrapper",
        repo_url: "https://github.com/JimmyOgb/SpecEscrow",
        spec: "Build a standard EIP-1193 provider wrapper for GenLayer StudioNet that connects to MetaMask seamlessly.",
        acceptance_rubric: "Must support eth_requestAccounts, eth_chainId (61997), and custom event emission. Zero unhandled errors.",
        reward_amount: 500,
        deadline_ts: 1795764316,
        pr_url: "",
        status: "CLAIMED",
        score: 0,
        verdict: "",
        missing_criteria: [],
        reasoning: "",
      },
      {
        bounty_id: 2,
        sponsor: "0xE4220c4b71877bb94EB173f467ef5c5557017085",
        contributor: "0x2c7536E3605D9C16a7a3D7b1898e529396a65c23",
        title: "Production-Grade GenLayer Escrow Adjudicator",
        repo_url: "https://github.com/JimmyOgb/SpecEscrow",
        spec: "Build an Intelligent Contract that automatically adjudicates GitHub PR deliverables against structured rubrics.",
        acceptance_rubric: "Must fetch deliverable, run comparative LLM consensus, return valid verdict, score, reasoning, and update contributor leaderboard.",
        reward_amount: 750,
        deadline_ts: 1796369370,
        pr_url: "https://raw.githubusercontent.com/JimmyOgb/SpecEscrow/main/contracts/bounty_adjudicator.py",
        status: "REJECTED",
        score: 0,
        verdict: "REJECTED",
        missing_criteria: [
          "Deliverable file not found (404) at submitted URL",
          "No Intelligent Contract implementation"
        ],
        reasoning: "The submitted deliverable URL returns '404: Not Found', meaning no code was actually provided for evaluation.",
      },
      deploymentData?.verifiedLiveBounty || {
        bounty_id: 3,
        sponsor: "0xE4220c4b71877bb94EB173f467ef5c5557017085",
        contributor: "0x2c7536E3605D9C16a7a3D7b1898e529396a65c23",
        title: "EIP-1193 Ethereum Provider Specification Deliverable",
        repo_url: "https://github.com/ethereum/EIPs",
        spec: "Deliver the official Ethereum Provider JavaScript API specification document.",
        acceptance_rubric: "Must contain Ethereum Provider JavaScript API definitions, request method interface, and JSON-RPC error codes.",
        reward_amount: 500,
        deadline_ts: 1795766319,
        pr_url: "https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-1193.md",
        status: "REVISION_NEEDED",
        score: 65,
        verdict: "REVISION_NEEDED",
        missing_criteria: [
          "Explicit JSON-RPC error codes and their meanings",
          "Complete specification document"
        ],
        reasoning: "The supplied content includes Ethereum Provider definitions, the typed request interface, Promise behavior, and several provider-specific error codes. However, it is truncated before completing the error specification.",
      }
    ];

    if (deploymentData?.verifiedLiveBounty) {
      const idx = bounties.findIndex((b: any) => b.bounty_id === deploymentData.verifiedLiveBounty.bounty_id);
      if (idx >= 0) {
        bounties[idx] = deploymentData.verifiedLiveBounty;
      } else {
        bounties.push(deploymentData.verifiedLiveBounty);
      }
    }

    const leaderboard = deploymentData?.leaderboard || [
      {
        contributor: "0xa5bC3717D6b516C82446441Fb2d492d11a52816d",
        approved_bounties: 0,
        rejected_bounties: 0,
        total_score: 0,
        avg_score: 0,
        total_earned: 0,
      },
      {
        contributor: "0x2c7536E3605D9C16a7a3D7b1898e529396a65c23",
        approved_bounties: 0,
        rejected_bounties: 1,
        total_score: 0,
        avg_score: 0,
        total_earned: 0,
      }
    ];

    return NextResponse.json({
      success: true,
      contractAddress: CONTRACT_ADDRESS,
      bounties,
      leaderboard,
      transactions: deploymentData?.transactions || null,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
