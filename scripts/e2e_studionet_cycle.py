import os
import sys
import json
import time
import copy
import requests

# Patch requests to auto-retry on connection reset or transient network glitch
_orig_post = requests.post
_orig_session_post = requests.Session.post

def _retry_post(*args, **kwargs):
    for attempt in range(6):
        try:
            return _orig_post(*args, **kwargs)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt == 5:
                raise
            time.sleep(1.5 * (attempt + 1))

def _retry_session_post(self, *args, **kwargs):
    for attempt in range(6):
        try:
            return _orig_session_post(self, *args, **kwargs)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt == 5:
                raise
            time.sleep(1.5 * (attempt + 1))

requests.post = _retry_post
requests.Session.post = _retry_session_post

from genlayer_py import create_client, create_account, studio_devnet
from genlayer_py.exceptions import GenLayerError

DEPLOYER_KEY = "0xf4bfb7f98529b7acf3ec1e9fc2fcf1d573d15d7485163dc35df4ecf4cc695b0f"
CONTRIBUTOR_KEY = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"

DEPLOYED_CONTRACT_ADDRESS = "0x6a120cead2e3F7d6b988938969F40fe57676Ad4C"
DEPLOY_TX_HASH = "0x8804a1bc75fb3f56d343984049aae356bfc2010329f01f50463cd0b23f2cb18d"

studio_next = copy.deepcopy(studio_devnet)
studio_next.rpc_urls['default']['http'] = ['https://studio-next.genlayer.com/api']


def wait_for_tx(client, tx_hash: str, label: str, max_retries: int = 50):
    print(f"Waiting for {label} [{tx_hash}]...", flush=True)
    for i in range(max_retries):
        try:
            tx = client.get_transaction(tx_hash)
            if tx:
                state = tx.get("lifecycle", {}).get("state", "")
                result = tx.get("txExecutionResultName", "")
                print(f"  [{i*3}s] State: {state} | Result: {result}", flush=True)
                if state in ("finalized", "decided"):
                    if result == "FINISHED_WITH_ERROR":
                        raise RuntimeError(f"GenLayer tx {tx_hash} reverted: FINISHED_WITH_ERROR")
                    return tx
        except Exception as e:
            if "reverted" in str(e):
                raise
            print(f"  [{i*3}s] Waiting ({e})...", flush=True)
        time.sleep(3)
    raise TimeoutError(f"Tx {tx_hash} timed out")


def main():
    sponsor = create_account(DEPLOYER_KEY)
    contributor = create_account(CONTRIBUTOR_KEY)
    
    print("==================================================================", flush=True)
    print("SpecEscrow Full StudioNet End-to-End Smoke Test", flush=True)
    print("==================================================================", flush=True)
    print(f"Deployed Contract:  {DEPLOYED_CONTRACT_ADDRESS}", flush=True)
    print(f"Deploy Tx Hash:     {DEPLOY_TX_HASH}", flush=True)
    print(f"Sponsor:            {sponsor.address}", flush=True)
    print(f"Contributor:        {contributor.address}", flush=True)
    print("------------------------------------------------------------------", flush=True)
    
    sponsor_client = create_client(chain=studio_next, account=sponsor)
    contrib_client = create_client(chain=studio_next, account=contributor)
    
    # Step 1: Create Bounty #3
    print("\n[Step 1/4] Sponsor creating new bounty on-chain...", flush=True)
    create_args = [
        "EIP-1193 Ethereum Provider Specification Deliverable",
        "https://github.com/ethereum/EIPs",
        "Deliver the official Ethereum Provider JavaScript API specification document.",
        "Must contain Ethereum Provider JavaScript API definitions, request method interface, and JSON-RPC error codes.",
        500,
        int(time.time()) + 7 * 86400,
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
        fees={"distribution": est_create["distribution"], "feeValue": est_create["feeValue"]},
    )
    print(f"GenLayer Create Bounty Tx Hash: {tx_create}", flush=True)
    wait_for_tx(sponsor_client, tx_create, "create_bounty")
    
    # Read created bounty id
    all_bounties = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_all_bounties")
    bounty_id = all_bounties[-1]["bounty_id"]
    print(f"Successfully Created Bounty ID #{bounty_id} (Total bounties: {len(all_bounties)})", flush=True)
    
    # Step 2: Claim Bounty
    print(f"\n[Step 2/4] Contributor {contributor.address} claiming Bounty #{bounty_id}...", flush=True)
    est_claim = contrib_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="claim_bounty",
        args=[bounty_id],
    )
    tx_claim = contrib_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="claim_bounty",
        args=[bounty_id],
        fees={"distribution": est_claim["distribution"], "feeValue": est_claim["feeValue"]},
    )
    print(f"GenLayer Claim Bounty Tx Hash: {tx_claim}", flush=True)
    wait_for_tx(contrib_client, tx_claim, "claim_bounty")
    
    # Step 3: Submit PR
    pr_url = "https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-1193.md"
    print(f"\n[Step 3/4] Contributor submitting live public deliverable ({pr_url})...", flush=True)
    est_submit = contrib_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="submit_pr",
        args=[bounty_id, pr_url],
    )
    tx_submit = contrib_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="submit_pr",
        args=[bounty_id, pr_url],
        fees={"distribution": est_submit["distribution"], "feeValue": est_submit["feeValue"]},
    )
    print(f"GenLayer Submit PR Tx Hash: {tx_submit}", flush=True)
    wait_for_tx(contrib_client, tx_submit, "submit_pr")
    
    # Step 4: Adjudicate PR
    print(f"\n[Step 4/4] Triggering on-chain consensus adjudication for Bounty #{bounty_id}...", flush=True)
    est_adj = sponsor_client.estimate_transaction_fees_for_write(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="adjudicate_pr",
        args=[bounty_id],
    )
    tx_adj = sponsor_client.write_contract(
        address=DEPLOYED_CONTRACT_ADDRESS,
        function_name="adjudicate_pr",
        args=[bounty_id],
        fees={"distribution": est_adj["distribution"], "feeValue": est_adj["feeValue"]},
    )
    print(f"GenLayer Adjudicate PR Tx Hash: {tx_adj}", flush=True)
    wait_for_tx(sponsor_client, tx_adj, "adjudicate_pr", max_retries=60)
    
    # Verify final on-chain state
    final_bounty = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_bounty", args=[bounty_id])
    leaderboard = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_leaderboard")
    stats = sponsor_client.read_contract(DEPLOYED_CONTRACT_ADDRESS, "get_contributor_stats", args=[contributor.address])
    
    print("\n==================================================================", flush=True)
    print(f"LIVE ON-CHAIN STATE VERIFICATION (BOUNTY #{bounty_id})", flush=True)
    print("==================================================================", flush=True)
    print(f"Status:            {final_bounty['status']}", flush=True)
    print(f"Verdict:           {final_bounty['verdict']}", flush=True)
    print(f"Score:             {final_bounty['score']} / 100", flush=True)
    print(f"Missing Criteria:  {final_bounty['missing_criteria']}", flush=True)
    print(f"Reasoning:         {final_bounty['reasoning']}", flush=True)
    print(f"Contributor Stats: {stats}", flush=True)
    print(f"Leaderboard:       {leaderboard}", flush=True)
    print("------------------------------------------------------------------", flush=True)
    print("ALL 5 VERIFIED TRANSACTION HASHES ON STUDIONET:", flush=True)
    print(f"1. Deploy Contract:  {DEPLOY_TX_HASH}", flush=True)
    print(f"2. Create Bounty:    {tx_create}", flush=True)
    print(f"3. Claim Bounty:     {tx_claim}", flush=True)
    print(f"4. Submit PR:        {tx_submit}", flush=True)
    print(f"5. Adjudicate PR:    {tx_adj}", flush=True)
    print("==================================================================", flush=True)
    
    all_txs = {
        "deploy": DEPLOY_TX_HASH,
        "createBounty": tx_create,
        "claimBounty": tx_claim,
        "submitPr": tx_submit,
        "adjudicatePr": tx_adj,
    }
    
    deployment_record = {
        "network": "GenLayer StudioNet",
        "rpcUrl": "https://studio-next.genlayer.com/api",
        "chainId": 61997,
        "contractAddress": DEPLOYED_CONTRACT_ADDRESS,
        "deployer": sponsor.address,
        "contributor": contributor.address,
        "transactions": all_txs,
        "verifiedLiveBounty": final_bounty,
        "contributorStats": stats,
        "leaderboard": leaderboard,
        "timestamp": int(time.time()),
    }
    
    os.makedirs("artifacts", exist_ok=True)
    with open("artifacts/deployment.json", "w", encoding="utf-8") as f:
        json.dump(deployment_record, f, indent=2)
    print("Saved artifacts/deployment.json successfully!", flush=True)


if __name__ == "__main__":
    main()
