import json
import pytest
import datetime

DELIVERABLE_APPROVED_MOCK = {
    "verdict": "APPROVED",
    "score": 92,
    "missing_criteria": [],
    "reasoning": "Pull request meets all specification and rubric acceptance criteria with comprehensive tests."
}

DELIVERABLE_REVISION_MOCK = {
    "verdict": "REVISION_NEEDED",
    "score": 58,
    "missing_criteria": ["Missing unit tests for edge cases", "Documentation comments not updated"],
    "reasoning": "Core functionality is implemented, but tests and docstrings are incomplete."
}

DELIVERABLE_REJECTED_MOCK = {
    "verdict": "REJECTED",
    "score": 20,
    "missing_criteria": ["Implementation is incomplete", "Does not follow architectural guidelines"],
    "reasoning": "Deliverable failed to fulfill the core rubric requirements."
}

def to_hex_addr(addr_bytes: bytes) -> str:
    return "0x" + addr_bytes.hex().lower()


def test_full_happy_path(direct_vm, direct_deploy, direct_alice, direct_bob):
    """
    Full happy path:
    create_bounty -> claim_bounty -> submit_pr -> adjudicate_pr (APPROVED) -> stats & leaderboard updated
    """
    contract = direct_deploy("contracts/bounty_adjudicator.py")
    alice_addr = to_hex_addr(direct_alice)
    bob_addr = to_hex_addr(direct_bob)
    
    # 1. Alice creates bounty
    direct_vm.sender = direct_alice
    future_deadline = int(datetime.datetime.now(datetime.timezone.utc).timestamp()) + 86400
    
    bounty_id = contract.create_bounty(
        "Implement EIP-1193 Provider",
        "https://github.com/org/repo",
        "Build a standard EIP-1193 provider wrapper for GenLayer StudioNet.",
        "Must support eth_requestAccounts, eth_chainId, and custom events. 100% test coverage.",
        500,
        future_deadline,
    )
    assert bounty_id == 1
    
    bounty = contract.get_bounty(bounty_id)
    assert bounty["status"] == "OPEN"
    assert bounty["reward_amount"] == 500
    assert bounty["sponsor"].lower() == alice_addr
    
    # 2. Bob claims bounty
    direct_vm.sender = direct_bob
    contract.claim_bounty(bounty_id)
    
    bounty = contract.get_bounty(bounty_id)
    assert bounty["status"] == "CLAIMED"
    assert bounty["contributor"].lower() == bob_addr
    
    # 3. Bob submits PR
    pr_url = "https://github.com/org/repo/pull/42.diff"
    contract.submit_pr(bounty_id, pr_url)
    
    bounty = contract.get_bounty(bounty_id)
    assert bounty["status"] == "SUBMITTED"
    assert bounty["pr_url"] == pr_url
    
    # 4. Adjudicate PR (mock web and LLM)
    direct_vm.mock_web(
        r".*github\.com/org/repo/pull/42\.diff.*",
        {"status": 200, "body": "diff --git a/provider.ts b/provider.ts\n+export class Provider { ... }"},
    )
    direct_vm.mock_llm(
        r".*SpecEscrow.*",
        json.dumps(DELIVERABLE_APPROVED_MOCK),
    )
    
    adj_result = contract.adjudicate_pr(bounty_id)
    assert adj_result["verdict"] == "APPROVED"
    assert adj_result["score"] == 92
    
    bounty = contract.get_bounty(bounty_id)
    assert bounty["status"] == "APPROVED"
    assert bounty["score"] == 92
    assert bounty["verdict"] == "APPROVED"
    assert len(bounty["missing_criteria"]) == 0
    
    # 5. Check Bob's reputation stats & leaderboard
    stats = contract.get_contributor_stats(bob_addr)
    assert stats["approved_bounties"] == 1
    assert stats["rejected_bounties"] == 0
    assert stats["total_score"] == 92
    assert stats["avg_score"] == 92
    assert stats["total_earned"] == 500
    
    leaderboard = contract.get_leaderboard()
    assert len(leaderboard) == 1
    assert leaderboard[0]["contributor"].lower() == bob_addr
    assert leaderboard[0]["approved_bounties"] == 1


def test_revision_and_subsequent_approval(direct_vm, direct_deploy, direct_alice, direct_bob):
    """
    Revision needed flow:
    adjudicate_pr -> REVISION_NEEDED -> submit_pr again -> adjudicate_pr -> APPROVED
    """
    contract = direct_deploy("contracts/bounty_adjudicator.py")
    direct_vm.sender = direct_alice
    future_deadline = int(datetime.datetime.now(datetime.timezone.utc).timestamp()) + 86400
    
    bid = contract.create_bounty(
        "Build OAuth Flow",
        "https://github.com/org/repo",
        "Implement OAuth2 PKCE login.",
        "Full rubric: secure token storage, zero leaks, refresh flow.",
        1000,
        future_deadline,
    )
    
    direct_vm.sender = direct_bob
    contract.claim_bounty(bid)
    
    # First submission
    contract.submit_pr(bid, "https://github.com/org/repo/pull/1.diff")
    
    direct_vm.mock_web(
        r".*github\.com/org/repo/pull/1\.diff.*",
        {"status": 200, "body": "Initial incomplete PR diff"},
    )
    direct_vm.mock_llm(
        r".*SpecEscrow.*",
        json.dumps(DELIVERABLE_REVISION_MOCK),
    )
    
    res1 = contract.adjudicate_pr(bid)
    assert res1["verdict"] == "REVISION_NEEDED"
    assert res1["score"] == 58
    assert len(res1["missing_criteria"]) == 2
    
    bounty = contract.get_bounty(bid)
    assert bounty["status"] == "REVISION_NEEDED"
    
    # Clear mocks before new phase
    direct_vm.clear_mocks()
    
    # Bob fixes PR and resubmits
    contract.submit_pr(bid, "https://github.com/org/repo/pull/1_revised.diff")
    assert contract.get_bounty(bid)["status"] == "SUBMITTED"
    
    # Second adjudication: APPROVED
    direct_vm.mock_web(
        r".*github\.com/org/repo/pull/1_revised\.diff.*",
        {"status": 200, "body": "Revised complete PR diff with all tests"},
    )
    direct_vm.mock_llm(
        r".*SpecEscrow.*",
        json.dumps(DELIVERABLE_APPROVED_MOCK),
    )
    
    res2 = contract.adjudicate_pr(bid)
    assert res2["verdict"] == "APPROVED"
    assert contract.get_bounty(bid)["status"] == "APPROVED"


def test_rejection_flow(direct_vm, direct_deploy, direct_alice, direct_bob):
    """
    Rejection flow:
    adjudicate_pr -> REJECTED -> updates contributor stats
    """
    contract = direct_deploy("contracts/bounty_adjudicator.py")
    direct_vm.sender = direct_alice
    bob_addr = to_hex_addr(direct_bob)
    future_deadline = int(datetime.datetime.now(datetime.timezone.utc).timestamp()) + 86400
    
    bid = contract.create_bounty(
        "Build Compiler Plugin",
        "https://github.com/org/repo",
        "WASM parser in Rust.",
        "Must pass all bytecode test fixtures.",
        750,
        future_deadline,
    )
    
    direct_vm.sender = direct_bob
    contract.claim_bounty(bid)
    contract.submit_pr(bid, "https://github.com/org/repo/pull/99.diff")
    
    direct_vm.mock_web(
        r".*github\.com/org/repo/pull/99\.diff.*",
        {"status": 200, "body": "Empty dummy file"},
    )
    direct_vm.mock_llm(
        r".*SpecEscrow.*",
        json.dumps(DELIVERABLE_REJECTED_MOCK),
    )
    
    res = contract.adjudicate_pr(bid)
    assert res["verdict"] == "REJECTED"
    assert res["score"] == 20
    
    bounty = contract.get_bounty(bid)
    assert bounty["status"] == "REJECTED"
    
    stats = contract.get_contributor_stats(bob_addr)
    assert stats["approved_bounties"] == 0
    assert stats["rejected_bounties"] == 1
    assert stats["total_score"] == 20
    assert stats["total_earned"] == 0


def test_timeout_expiration_and_refund(direct_vm, direct_deploy, direct_alice):
    """
    Timeout refund path:
    bounty past deadline can be expired and refunded.
    """
    contract = direct_deploy("contracts/bounty_adjudicator.py")
    direct_vm.sender = direct_alice
    
    # Bounty with past deadline
    past_deadline = int(datetime.datetime.now(datetime.timezone.utc).timestamp()) - 100
    bid = contract.create_bounty(
        "Expired Task",
        "https://github.com/org/repo",
        "Past task spec",
        "Past rubric",
        100,
        past_deadline,
    )
    
    bounty = contract.get_bounty(bid)
    assert bounty["status"] == "OPEN"
    
    contract.expire_and_refund(bid)
    
    bounty = contract.get_bounty(bid)
    assert bounty["status"] == "EXPIRED"
    assert "refunded to sponsor" in bounty["reasoning"]


def test_unauthorized_and_invalid_state_transitions(direct_vm, direct_deploy, direct_alice, direct_bob):
    """
    Test unauthorized calls and invalid state reverts.
    """
    contract = direct_deploy("contracts/bounty_adjudicator.py")
    direct_vm.sender = direct_alice
    future_deadline = int(datetime.datetime.now(datetime.timezone.utc).timestamp()) + 86400
    
    # Invalid creation: empty title
    with pytest.raises(Exception):
        contract.create_bounty("", "https://github.com/org/repo", "spec", "rubric", 100, future_deadline)
    
    # Invalid creation: zero reward
    with pytest.raises(Exception):
        contract.create_bounty("Title", "https://github.com/org/repo", "spec", "rubric", 0, future_deadline)
    
    bid = contract.create_bounty(
        "Valid Task",
        "https://github.com/org/repo",
        "Spec",
        "Rubric",
        300,
        future_deadline,
    )
    
    # Sponsor cannot claim their own bounty
    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        contract.claim_bounty(bid)
    
    # Non-existent bounty claim
    direct_vm.sender = direct_bob
    with pytest.raises(Exception):
        contract.claim_bounty(999)
        
    # Cannot expire before deadline
    with pytest.raises(Exception):
        contract.expire_and_refund(bid)
        
    # Bob claims
    contract.claim_bounty(bid)
    
    # Cannot claim already claimed bounty
    with pytest.raises(Exception):
        contract.claim_bounty(bid)
        
    # Alice (non-contributor) cannot submit PR
    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        contract.submit_pr(bid, "https://github.com/org/repo/pull/1.diff")
        
    # Bob cannot submit invalid PR URL
    direct_vm.sender = direct_bob
    with pytest.raises(Exception):
        contract.submit_pr(bid, "https://malicious-site.com/hack.diff")
        
    # Cannot adjudicate before submission
    with pytest.raises(Exception):
        contract.adjudicate_pr(bid)
