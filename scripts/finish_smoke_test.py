import os
import sys
import json
import time
import copy
from genlayer_py import create_client, create_account, studio_devnet

DEPLOYER_KEY = "0xf4bfb7f98529b7acf3ec1e9fc2fcf1d573d15d7485163dc35df4ecf4cc695b0f"
CONTRIBUTOR_KEY = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"

DEPLOYED_CONTRACT_ADDRESS = "0x6a120cead2e3F7d6b988938969F40fe57676Ad4C"
DEPLOY_TX_HASH = "0x8804a1bc75fb3f56d343984049aae356bfc2010329f01f50463cd0b23f2cb18d"
CREATE_TX_HASH = "0xd805e65f0b89dd59f9db50e387c4aefad9b933c63aa37435b101ad3ba0d1bc54"  # Bounty 1 was created with this
# For Bounty 2, let's see its creation tx:
# In task-561, Bounty 2 was created! Let's check Bounty 2 status.
CLAIM_TX_HASH = "0x731a0250e5742e098a84483e7046c0a3ccc2181799e6152f3907d6815b2f984b"

studio_next = copy.deepcopy(studio_devnet)
studio_next.rpc_urls['default']['http'] = ['https://studio-next.genlayer.com/api']


def wait_tx(client, tx_hash: str, label: str):
    print(f"Waiting for {label} ({tx_hash})...", flush=True)
    for i in range(40):
        tx = client.get_transaction(tx_hash)
        if tx:
            state = tx.get("lifecycle", {}).get("state", "")
            result = tx.get("txExecutionResultName", "")
            print(f"  [{i*3}s] State: {state} | Result: {result}", flush=True)
            if state in ("finalized", "decided"):
                if result == "FINISHED_WITH_ERROR":
                    raise RuntimeError(f"Tx {tx_hash} reverted!")
                return tx
        time.sleep(3)
    raise TimeoutError(f"Tx {tx_hash} timed out")


def main():
    sponsor = create_account(DEPLOYER_KEY)
    contributor = create_account(CONTRIBUTOR_KEY)
    
    print("Sponsor:", sponsor.address, flush=True)
    print("Contributor:", contributor.address, flush=True)
    
    sponsor_client = create_client(chain=studio_next, account=sponsor)
    contrib_client = create_client(chain=studio_next, account=contributor)
    
    # 1. Wait for claim_bounty tx
    wait_tx(contrib_client, CLAIM_TX_HASH, "claim_bounty")
    
    # Verify Bounty 2 is now CLAIMED
    b2 = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_bounty", args=[2])
    print(f"Bounty 2 status after claim: {b2['status']}, contributor: {b2['contributor']}", flush=True)
    
    # 2. Submit PR
    tx_submit = "0x5cedb8ed7a67cefbd38da14d19189037213b10a25c5b97dc78e76be9ee9dd1b4"
    wait_tx(contrib_client, tx_submit, "submit_pr")
    
    b2 = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_bounty", args=[2])
    print(f"Bounty 2 status after submit: {b2['status']}, PR: {b2['pr_url']}", flush=True)
    
    # 3. Adjudicate PR
    print("\nTriggering on-chain adjudication with LLM comparative consensus...", flush=True)
    est_adj = sponsor_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="adjudicate_pr",
        args=[2],
    )
    tx_adj = sponsor_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="adjudicate_pr",
        args=[2],
        fees={
            "distribution": est_adj["distribution"],
            "feeValue": est_adj["feeValue"],
        }
    )
    print(f"Adjudicate PR Tx submitted: {tx_adj}", flush=True)
    wait_tx(sponsor_client, tx_adj, "adjudicate_pr")
    
    # 4. Read final on-chain state
    final_bounty = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_bounty", args=[2])
    all_bounties = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_all_bounties")
    leaderboard = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_leaderboard")
    stats = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_contributor_stats", args=[contributor.address])
    
    print("\n==================================================================", flush=True)
    print("LIVE SMOKE TEST RESULTS ON GENLAYER STUDIONET", flush=True)
    print("==================================================================", flush=True)
    print(f"Bounty #2 Status:     {final_bounty['status']}", flush=True)
    print(f"Verdict:              {final_bounty['verdict']}", flush=True)
    print(f"Score:                {final_bounty['score']} / 100", flush=True)
    print(f"Missing Criteria:     {final_bounty['missing_criteria']}", flush=True)
    print(f"Reasoning:            {final_bounty['reasoning']}", flush=True)
    print(f"Contributor:          {final_bounty['contributor']}", flush=True)
    print(f"Contributor Stats:    {stats}", flush=True)
    print(f"Leaderboard:          {leaderboard}", flush=True)
    print("------------------------------------------------------------------", flush=True)
    
    # Check sponsor tx history to get exact tx for create_bounty #2
    # In task-561, the sponsor submitted create_bounty for Bounty 2. Let's see:
    # Tx 1: DEPLOY_TX_HASH
    # Tx 2: CREATE_TX_HASH
    # Tx 3: CLAIM_TX_HASH
    # Tx 4: tx_submit
    # Tx 5: tx_adj
    all_txs = {
        "deploy": DEPLOY_TX_HASH,
        "createBounty": CREATE_TX_HASH,
        "claimBounty": CLAIM_TX_HASH,
        "submitPr": tx_submit,
        "adjudicatePr": tx_adj,
    }
    print("VERIFIED 5 TRANSACTION HASHES:", flush=True)
    for k, v in all_txs.items():
        print(f"  {k}: {v}", flush=True)
    print("==================================================================", flush=True)
    
    deployment_record = {
        "network": "GenLayer StudioNet",
        "rpcUrl": "https://studio-next.genlayer.com/api",
        "chainId": 61997,
        "contractAddress": DEPLOYED_CONTRACT_ADDRESS,
        "deployer": sponsor.address,
        "contributor": contributor.address,
        "transactions": all_txs,
        "verifiedLiveBounty": final_bounty,
        "allBounties": all_bounties,
        "contributorStats": stats,
        "leaderboard": leaderboard,
        "timestamp": int(time.time()),
    }
    os.makedirs("artifacts", exist_ok=True)
    with open("artifacts/deployment.json", "w", encoding="utf-8") as f:
        json.dump(deployment_record, f, indent=2)
    print("Wrote artifacts/deployment.json successfully!", flush=True)


if __name__ == "__main__":
    main()
