import os
import sys
import json
import time
import copy
from genlayer_py import create_client, create_account, studio_devnet
from genlayer_py.exceptions import GenLayerError

# Known deployer key with 1000 GEN
DEPLOYER_KEY = "0xf4bfb7f98529b7acf3ec1e9fc2fcf1d573d15d7485163dc35df4ecf4cc695b0f"

# Dedicated contributor key
CONTRIBUTOR_KEY = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"

DEPLOYED_CONTRACT_ADDRESS = "0x6a120cead2e3F7d6b988938969F40fe57676Ad4C"
DEPLOY_TX_HASH = "0x8804a1bc75fb3f56d343984049aae356bfc2010329f01f50463cd0b23f2cb18d"

studio_next = copy.deepcopy(studio_devnet)
studio_next.rpc_urls['default']['http'] = ['https://studio-next.genlayer.com/api']


def wait_for_tx(client, tx_hash: str, label: str, max_retries: int = 40):
    print(f"Waiting for {label} ({tx_hash})...")
    for i in range(max_retries):
        tx = client.get_transaction(tx_hash)
        if tx:
            state = tx.get("lifecycle", {}).get("state", "")
            result = tx.get("txExecutionResultName", "")
            print(f"  [{i*3}s] State: {state} | Result: {result}")
            if state in ("finalized", "decided"):
                if result == "FINISHED_WITH_ERROR":
                    raise RuntimeError(f"Transaction {tx_hash} reverted: FINISHED_WITH_ERROR")
                return tx
        time.sleep(3)
    raise TimeoutError(f"Transaction {tx_hash} timed out")


def main():
    sponsor = create_account(DEPLOYER_KEY)
    contributor = create_account(CONTRIBUTOR_KEY)
    
    print("==================================================================")
    print("SpecEscrow Live StudioNet Smoke Test")
    print("==================================================================")
    print(f"Chain ID:            61997")
    print(f"RPC URL:             https://studio-next.genlayer.com/api")
    print(f"Deployed Contract:   {DEPLOYED_CONTRACT_ADDRESS}")
    print(f"Deploy Tx Hash:      {DEPLOY_TX_HASH}")
    print(f"Sponsor Account:     {sponsor.address}")
    print(f"Contributor Account: {contributor.address}")
    print("------------------------------------------------------------------")
    
    sponsor_client = create_client(chain=studio_next, account=sponsor)
    contrib_client = create_client(chain=studio_next, account=contributor)
    
    # 1. Create Bounty
    print("\n[1/4] Creating on-chain bounty...")
    create_args = [
        "Production-Grade GenLayer Escrow Adjudicator",
        "https://github.com/JimmyOgb/SpecEscrow",
        "Build an Intelligent Contract that automatically adjudicates GitHub PR deliverables against structured rubrics.",
        "Must fetch deliverable, run comparative LLM consensus, return valid verdict, score, reasoning, and update contributor leaderboard.",
        750,
        int(time.time()) + 14 * 86400,
    ]
    est_create = sponsor_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="create_bounty",
        args=create_args,
    )
    tx_create = sponsor_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="create_bounty",
        args=create_args,
        fees={
            "distribution": est_create["distribution"],
            "feeValue": est_create["feeValue"],
        }
    )
    print(f"Submitted create_bounty Tx: {tx_create}")
    wait_for_tx(sponsor_client, tx_create, "create_bounty")
    
    # Read bounties to get the new bounty_id
    all_bounties = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_all_bounties")
    bounty_id = all_bounties[-1]["bounty_id"]
    print(f"Created Bounty ID: {bounty_id} (Total bounties: {len(all_bounties)})")
    
    # 2. Claim Bounty
    print(f"\n[2/4] Contributor {contributor.address} claiming bounty {bounty_id}...")
    est_claim = contrib_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="claim_bounty",
        args=[bounty_id],
    )
    tx_claim = contrib_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="claim_bounty",
        args=[bounty_id],
        fees={
            "distribution": est_claim["distribution"],
            "feeValue": est_claim["feeValue"],
        }
    )
    print(f"Submitted claim_bounty Tx: {tx_claim}")
    wait_for_tx(contrib_client, tx_claim, "claim_bounty")
    
    # 3. Submit PR
    print(f"\n[3/4] Contributor submitting live public deliverable...")
    pr_url = "https://raw.githubusercontent.com/JimmyOgb/SpecEscrow/main/contracts/bounty_adjudicator.py"
    est_submit = contrib_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="submit_pr",
        args=[bounty_id, pr_url],
    )
    tx_submit = contrib_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="submit_pr",
        args=[bounty_id, pr_url],
        fees={
            "distribution": est_submit["distribution"],
            "feeValue": est_submit["feeValue"],
        }
    )
    print(f"Submitted submit_pr Tx: {tx_submit}")
    wait_for_tx(contrib_client, tx_submit, "submit_pr")
    
    # 4. Adjudicate PR (Leader & validators fetch URL, run comparative LLM consensus)
    print(f"\n[4/4] Triggering on-chain adjudication for bounty {bounty_id}...")
    est_adj = sponsor_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="adjudicate_pr",
        args=[bounty_id],
    )
    tx_adj = sponsor_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="adjudicate_pr",
        args=[bounty_id],
        fees={
            "distribution": est_adj["distribution"],
            "feeValue": est_adj["feeValue"],
        }
    )
    print(f"Submitted adjudicate_pr Tx: {tx_adj}")
    wait_for_tx(sponsor_client, tx_adj, "adjudicate_pr", max_retries=60)
    
    # Read final state
    final_bounty = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_bounty", args=[bounty_id])
    leaderboard = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_leaderboard")
    
    print("\n==================================================================")
    print("LIVE ON-CHAIN STATE VERIFICATION")
    print("==================================================================")
    print(f"Bounty #{bounty_id} Status:     {final_bounty['status']}")
    print(f"Verdict:              {final_bounty['verdict']}")
    print(f"Score:                {final_bounty['score']} / 100")
    print(f"Missing Criteria:     {final_bounty['missing_criteria']}")
    print(f"Reasoning:            {final_bounty['reasoning']}")
    print(f"Contributor:          {final_bounty['contributor']}")
    print(f"Leaderboard Entries:  {len(leaderboard)}")
    print("------------------------------------------------------------------")
    print("ALL 5 VERIFIED TRANSACTION HASHES:")
    print(f"1. Deploy Contract:   {DEPLOY_TX_HASH}")
    print(f"2. Create Bounty:     {tx_create}")
    print(f"3. Claim Bounty:      {tx_claim}")
    print(f"4. Submit PR:         {tx_submit}")
    print(f"5. Adjudicate PR:     {tx_adj}")
    print("==================================================================")
    
    # Save artifacts/deployment.json
    deployment_record = {
        "network": "GenLayer StudioNet",
        "rpcUrl": "https://studio-next.genlayer.com/api",
        "chainId": 61997,
        "contractAddress": DEPLOYED_CONTRACT_ADDRESS,
        "deployer": sponsor.address,
        "contributor": contributor.address,
        "transactions": {
            "deploy": DEPLOY_TX_HASH,
            "createBounty": tx_create,
            "claimBounty": tx_claim,
            "submitPr": tx_submit,
            "adjudicatePr": tx_adj,
        },
        "verifiedLiveBounty": final_bounty,
        "leaderboard": leaderboard,
        "timestamp": int(time.time()),
    }
    with open("artifacts/deployment.json", "w", encoding="utf-8") as f:
        json.dump(deployment_record, f, indent=2)
    print("\nSaved artifacts/deployment.json successfully.")


if __name__ == "__main__":
    main()
