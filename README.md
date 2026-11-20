# SpecEscrow

> **Autonomous Open-Source & Freelance Bounty Escrow Platform on GenLayer StudioNet**
> Powered by GenLayer Intelligent Contracts with Comparative LLM Consensus Adjudication

[![Live Demo](https://img.shields.io/badge/Live_App-specescrow.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://specescrow.vercel.app)
[![GenLayer StudioNet](https://img.shields.io/badge/GenLayer-StudioNet_Chain_61997-38bdf8?style=for-the-badge)](https://studio-next.genlayer.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🌐 Live Production Deployments

- **Web Application:** [https://specescrow.vercel.app](https://specescrow.vercel.app)
- **Deployed Contract Address (StudioNet):** [`0x6a120cead2e3F7d6b988938969F40fe57676Ad4C`](https://studio-next.genlayer.com)
- **Target Network:** **GenLayer StudioNet**
- **RPC URL:** `https://studio-next.genlayer.com/api`
- **Chain ID:** `61997` (`0xf22d`)
- **Native Currency:** `GEN` (18 decimals)

---

## ⛓️ 5 Verified On-Chain StudioNet Transactions

Every stage of the SpecEscrow lifecycle was executed and finalized directly against the live Intelligent Contract on **GenLayer StudioNet**:

| Lifecycle Stage | Transaction Hash | Status & Execution Result |
| :--- | :--- | :--- |
| **1. Deploy Contract** | `0x8804a1bc75fb3f56d343984049aae356bfc2010329f01f50463cd0b23f2cb18d` | `FINALIZED` (`FINISHED_WITH_RETURN`) |
| **2. Create Bounty** | `0xae51283dac5c6ed63db33d12cf8bdc5fea35f2b129c6224dd5cc0587d94f4e5b` | `FINALIZED` (`FINISHED_WITH_RETURN`) |
| **3. Claim Bounty** | `0xb5db5240a800cf6c1745532efa9d446dea669ef3f8fa484119a495a0c5f45bda` | `FINALIZED` (`FINISHED_WITH_RETURN`) |
| **4. Submit Deliverable (PR)** | `0x1171ebeaa3f3ccb9b5f25ef1d7f45ea6998c3c84fdb6bed20c320e33bf8b306d` | `FINALIZED` (`FINISHED_WITH_RETURN`) |
| **5. Adjudicate PR (LLM Consensus)** | `0xf28b25793f5d123f0fc75a8c7e1c637794f3e0f3e89f63ab364f57f6c7b0fdfc` | `FINALIZED` (`FINISHED_WITH_RETURN`) |

---

## 🧠 Live Consensus Evaluation Sample (Bounty #3)

During the live smoke test, the GenLayer validators fetched the public deliverable at `https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-1193.md`, executed comparative LLM consensus against the rubric, and returned the following structured on-chain adjudication:

```json
{
  "bounty_id": 3,
  "status": "REVISION_NEEDED",
  "verdict": "REVISION_NEEDED",
  "score": 65,
  "missing_criteria": [
    "Explicit JSON-RPC error codes and their meanings; the supplied excerpt references an Error Standards section but does not include it.",
    "Complete specification document; the submitted content ends mid-sentence in the RPC Errors section and omits subsequent sections, including event API definitions."
  ],
  "reasoning": "The supplied content includes Ethereum Provider definitions, the typed request interface, Promise behavior, and several provider-specific error codes. However, it is truncated before completing the error specification and does not include the referenced JSON-RPC error standards or the remaining API sections, so the supplied deliverable does not satisfy the requirement for the complete official specification."
}
```

---

## 🏛️ Architecture Overview

```
                      +---------------------------------------+
                      |          SpecEscrow Frontend          |
                      |  Next.js 14 App Router + Tailwind     |
                      |   Direct StudioNet Read-Only Explorer |
                      +-------------------+-------------------+
                                          |
                        MetaMask EIP-1193 | JSON-RPC (61997)
                                          v
                      +---------------------------------------+
                      |     GenLayer StudioNet Validator Net  |
                      |     (https://studio-next.genlayer.com)|
                      +-------------------+-------------------+
                                          |
                                          v
+---------------------------------------------------------------------------------+
|                       Intelligent Contract (GenVM Python)                       |
|                      contracts/bounty_adjudicator.py                            |
|                                                                                 |
|  [State Machine]                                                                |
|  OPEN  -->  CLAIMED  -->  SUBMITTED  -->  APPROVED | REVISION_NEEDED | REJECTED |
|    |           |               |                                                |
|    +-----------+---------------+--------->  EXPIRED (Deterministic Refund)      |
|                                                                                 |
|  [Execution Pipeline]                                                           |
|  1. gl.nondet.web.get(pr_url)         -> Fetches live GitHub deliverable        |
|  2. gl.nondet.prompt_comparative(...) -> Multi-validator LLM consensus rubric    |
|  3. JSON Schema Enforcement           -> Strict verdict, score, missing criteria|
|  4. On-Chain Reputation Tracking      -> Updates contributor stats & leaderboard|
+---------------------------------------------------------------------------------+
```

### Key Contract Features
1. **Pinned GenVM Runner:** `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }` ensuring deterministic, reproducible bytecode execution.
2. **Equivalence Principle:** Web requests and LLM prompt adjudication run inside non-deterministic execution blocks wrapped with comparative consensus (`prompt_comparative`), guaranteeing decentralized validator agreement.
3. **Bounded Lifecycles:** Bounties have strict deadlines. An authorized sponsor or any party can trigger `expire_and_refund` after `deadline_ts` to return escrowed funds if deliverables were never approved.
4. **On-Chain Reputation:** Contributor reputation is updated directly upon adjudication (`approved_bounties`, `rejected_bounties`, `total_score`, `avg_score`, `total_earned`).

---

## 🚀 Local Development & Testing

### 1. Prerequisites
- Python 3.12+
- Node.js 20+
- GenLayer CLI & GenVM toolchain (`gltest`, `genvm-lint`)

### 2. Contract Verification & Tests
Run static analysis and direct mode test suite:

```bash
# 1. Lint Intelligent Contract
genvm-lint check contracts/bounty_adjudicator.py

# 2. Run Direct Mode Test Suite
gltest tests/test_bounty_adjudicator.py -v
```

All 5 test suites cover:
- `test_full_happy_path`: End-to-end lifecycle resulting in `APPROVED` and leaderboard updates.
- `test_revision_and_subsequent_approval`: `REVISION_NEEDED` transition allowing re-submission.
- `test_rejection_flow`: Non-conforming deliverable resulting in `REJECTED` and reputation update.
- `test_timeout_expiration_and_refund`: Expired bounty refund flow.
- `test_unauthorized_and_invalid_state_transitions`: Permission checks and unauthorized caller reverts.

### 3. Frontend Development
Run the Next.js frontend locally:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to interact with the live GenLayer StudioNet contract.

---

## 📦 Project Structure

```
SpecEscrow/
├── contracts/
│   └── bounty_adjudicator.py         # Production GenLayer Intelligent Contract
├── tests/
│   └── test_bounty_adjudicator.py    # Direct mode test suite (5 comprehensive tests)
├── artifacts/
│   ├── bounty_adjudicator.abi.json   # Extracted ABI schema
│   └── deployment.json               # Full StudioNet deployment metadata & 5 tx hashes
├── scripts/
│   ├── e2e_studionet_cycle.py        # StudioNet end-to-end smoke test script
│   └── smoke_test_studionet.py       # Lifecycle test harness
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router (layout, page, API routes)
│   │   ├── components/               # Navbar, BountyBoard, Card, Modal, Leaderboard
│   │   └── lib/                      # genlayer-js, wallet integration, constants
│   ├── .env.example                  # Required environment variable template
│   └── package.json                  # Next.js 14, genlayer-js v2, Tailwind CSS
├── .gitignore                        # Strict security hygiene (zero tracked secrets)
└── README.md                         # Architecture, live links, and verification
```

---

## 🛡️ License

MIT License. Built for the GenLayer Ecosystem.
