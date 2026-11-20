# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass
from genlayer import *
import json
import re
import datetime

ZERO_ADDRESS_STR = "0x0000000000000000000000000000000000000000"

def _clean_and_parse_json(text_or_dict) -> dict:
    if isinstance(text_or_dict, dict):
        return text_or_dict
    s = str(text_or_dict).strip()
    first = s.find("{")
    last = s.rfind("}")
    if first != -1 and last != -1:
        s = s[first:last + 1]
    s = re.sub(r",(?!\s*?[\{\[\"\'\w])", "", s)
    return json.loads(s)


@allow_storage
@dataclass
class Bounty:
    bounty_id: u256
    sponsor: str
    contributor: str
    title: str
    repo_url: str
    spec: str
    acceptance_rubric: str
    reward_amount: u256
    deadline_ts: u256
    pr_url: str
    status: str
    score: u256
    verdict: str
    missing_criteria_json: str
    reasoning: str


@allow_storage
@dataclass
class ContributorStats:
    contributor: str
    approved_bounties: u256
    rejected_bounties: u256
    total_score: u256
    avg_score: u256
    total_earned: u256


class BountyAdjudicator(gl.Contract):
    bounties: TreeMap[u256, Bounty]
    bounty_ids: DynArray[u256]
    bounty_count: u256
    contributor_stats: TreeMap[str, ContributorStats]
    known_contributors: DynArray[str]

    def __init__(self):
        self.bounty_count = u256(0)

    # -------------------------------------------------------------------------
    # Helper Serialization
    # -------------------------------------------------------------------------

    def _bounty_to_dict(self, b: Bounty) -> dict:
        try:
            missing_criteria = json.loads(b.missing_criteria_json)
            if not isinstance(missing_criteria, list):
                missing_criteria = []
        except Exception:
            missing_criteria = []

        return {
            "bounty_id": int(b.bounty_id),
            "sponsor": b.sponsor,
            "contributor": b.contributor,
            "title": b.title,
            "repo_url": b.repo_url,
            "spec": b.spec,
            "acceptance_rubric": b.acceptance_rubric,
            "reward_amount": int(b.reward_amount),
            "deadline_ts": int(b.deadline_ts),
            "pr_url": b.pr_url,
            "status": b.status,
            "score": int(b.score),
            "verdict": b.verdict,
            "missing_criteria": missing_criteria,
            "reasoning": b.reasoning,
        }

    def _stats_to_dict(self, s: ContributorStats) -> dict:
        return {
            "contributor": s.contributor,
            "approved_bounties": int(s.approved_bounties),
            "rejected_bounties": int(s.rejected_bounties),
            "total_score": int(s.total_score),
            "avg_score": int(s.avg_score),
            "total_earned": int(s.total_earned),
        }

    # -------------------------------------------------------------------------
    # Core State-Changing Methods
    # -------------------------------------------------------------------------

    @gl.public.write
    def create_bounty(
        self,
        title: str,
        repo_url: str,
        spec: str,
        acceptance_rubric: str,
        reward_amount: int,
        deadline_ts: int,
    ) -> int:
        clean_title = title.strip()
        clean_repo = repo_url.strip()
        clean_spec = spec.strip()
        clean_rubric = acceptance_rubric.strip()

        if len(clean_title) == 0:
            raise gl.vm.UserError("Bounty title cannot be empty")
        if not (clean_repo.startswith("https://") or clean_repo.startswith("http://")):
            raise gl.vm.UserError("Invalid repository URL: must start with http:// or https://")
        if len(clean_spec) == 0:
            raise gl.vm.UserError("Bounty specification cannot be empty")
        if len(clean_rubric) == 0:
            raise gl.vm.UserError("Acceptance rubric cannot be empty")
        if reward_amount <= 0:
            raise gl.vm.UserError("Reward amount must be greater than zero")
        if deadline_ts <= 0:
            raise gl.vm.UserError("Deadline timestamp must be greater than zero")

        sponsor_str = str(gl.message.sender_address)

        new_id = u256(int(self.bounty_count) + 1)
        new_bounty = Bounty(
            bounty_id=new_id,
            sponsor=sponsor_str,
            contributor=ZERO_ADDRESS_STR,
            title=clean_title,
            repo_url=clean_repo,
            spec=clean_spec,
            acceptance_rubric=clean_rubric,
            reward_amount=u256(reward_amount),
            deadline_ts=u256(deadline_ts),
            pr_url="",
            status="OPEN",
            score=u256(0),
            verdict="",
            missing_criteria_json="[]",
            reasoning="",
        )

        self.bounties[new_id] = new_bounty
        self.bounty_ids.append(new_id)
        self.bounty_count = new_id

        return int(new_id)

    @gl.public.write
    def claim_bounty(self, bounty_id: int) -> None:
        bid = u256(bounty_id)
        if bid not in self.bounties:
            raise gl.vm.UserError(f"Bounty {bounty_id} does not exist")

        bounty = self.bounties[bid]
        if bounty.status != "OPEN":
            raise gl.vm.UserError(f"Cannot claim bounty in '{bounty.status}' status (must be OPEN)")

        now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
        if now > int(bounty.deadline_ts):
            raise gl.vm.UserError("Cannot claim an expired bounty")

        sender_str = str(gl.message.sender_address)
        if sender_str.lower() == bounty.sponsor.lower():
            raise gl.vm.UserError("Sponsor cannot claim their own bounty")

        bounty.contributor = sender_str
        bounty.status = "CLAIMED"
        self.bounties[bid] = bounty

        # Track known contributors
        sender_key = sender_str.lower()
        if sender_key not in self.contributor_stats:
            new_stats = ContributorStats(
                contributor=sender_str,
                approved_bounties=u256(0),
                rejected_bounties=u256(0),
                total_score=u256(0),
                avg_score=u256(0),
                total_earned=u256(0),
            )
            self.contributor_stats[sender_key] = new_stats
            self.known_contributors.append(sender_key)

    @gl.public.write
    def submit_pr(self, bounty_id: int, pr_url: str) -> None:
        bid = u256(bounty_id)
        if bid not in self.bounties:
            raise gl.vm.UserError(f"Bounty {bounty_id} does not exist")

        bounty = self.bounties[bid]
        sender_str = str(gl.message.sender_address)
        if sender_str.lower() != bounty.contributor.lower():
            raise gl.vm.UserError("Only the assigned contributor can submit a PR")

        if bounty.status not in ["CLAIMED", "REVISION_NEEDED"]:
            raise gl.vm.UserError(
                f"PR submission not allowed in status '{bounty.status}' (must be CLAIMED or REVISION_NEEDED)"
            )

        now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
        if now > int(bounty.deadline_ts):
            raise gl.vm.UserError("Submission deadline has passed")

        clean_pr_url = pr_url.strip()
        is_valid_url = (
            clean_pr_url.startswith("https://github.com/")
            or clean_pr_url.startswith("https://raw.githubusercontent.com/")
            or clean_pr_url.startswith("https://api.github.com/")
            or clean_pr_url.startswith("https://gist.github.com/")
            or clean_pr_url.startswith("https://gist.githubusercontent.com/")
        )
        if not is_valid_url:
            raise gl.vm.UserError(
                "Invalid deliverable URL: must be a public GitHub PR, diff, API, or raw content URL"
            )

        bounty.pr_url = clean_pr_url
        bounty.status = "SUBMITTED"
        self.bounties[bid] = bounty

    @gl.public.write
    def adjudicate_pr(self, bounty_id: int) -> dict:
        bid = u256(bounty_id)
        if bid not in self.bounties:
            raise gl.vm.UserError(f"Bounty {bounty_id} does not exist")

        bounty = self.bounties[bid]
        if bounty.status != "SUBMITTED":
            raise gl.vm.UserError(
                f"Cannot adjudicate bounty in status '{bounty.status}' (must be SUBMITTED)"
            )

        target_url = bounty.pr_url
        title = bounty.title
        repo = bounty.repo_url
        spec = bounty.spec
        rubric = bounty.acceptance_rubric

        def nondet_eval():
            # 1. Fetch deliverable from the public web
            try:
                res = gl.nondet.web.get(target_url)
                body_text = res.body.decode("utf-8", errors="replace")[:6000]
            except Exception as e:
                body_text = f"Error fetching deliverable: {str(e)}"

            # 2. Formulate rubric evaluation prompt
            prompt = f"""You are SpecEscrow's AI Adjudicator. Evaluate this code deliverable against the project specification and acceptance rubric.

Bounty: {title}
Repository: {repo}

Specification:
{spec}

Acceptance Rubric:
{rubric}

Submitted Deliverable ({target_url}):
{body_text}

Provide an objective assessment.
Return ONLY valid JSON matching this exact structure:
{{
  "verdict": "APPROVED" | "REVISION_NEEDED" | "REJECTED",
  "score": <integer from 0 to 100>,
  "missing_criteria": ["<missing item 1>", ...],
  "reasoning": "<concise justification within 2-3 sentences>"
}}

Scoring Guidelines:
- "APPROVED": Meets all core requirements and acceptance criteria (score 75-100).
- "REVISION_NEEDED": Partially completed or has minor fixable defects (score 40-74).
- "REJECTED": Fails fundamental requirements, empty deliverable, or severe flaws (score 0-39).
"""
            raw_response = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _clean_and_parse_json(raw_response)

            # Defensive parsing and normalization
            verdict = str(parsed.get("verdict", "REJECTED")).strip().upper()
            if verdict not in ["APPROVED", "REVISION_NEEDED", "REJECTED"]:
                verdict = "REJECTED"

            try:
                score_num = int(float(parsed.get("score", 0)))
                score_num = max(0, min(100, score_num))
            except Exception:
                score_num = 0

            # Ensure consistency between score and verdict
            if verdict == "APPROVED" and score_num < 70:
                verdict = "REVISION_NEEDED" if score_num >= 40 else "REJECTED"
            elif verdict == "REJECTED" and score_num >= 75:
                score_num = 35

            missing = parsed.get("missing_criteria", [])
            if not isinstance(missing, list):
                missing = [str(missing)]
            clean_missing = [str(item).strip() for item in missing if str(item).strip()]

            reasoning = str(parsed.get("reasoning", "Adjudication completed.")).strip()

            result_payload = {
                "verdict": verdict,
                "score": score_num,
                "missing_criteria": clean_missing,
                "reasoning": reasoning,
            }
            return json.dumps(result_payload, sort_keys=True)

        consensus_json_str = gl.eq_principle.prompt_comparative(
            nondet_eval,
            principle="Outputs must agree on verdict and assign compatible scores within 15 points tolerance.",
        )
        final_result = _clean_and_parse_json(consensus_json_str)

        verdict = str(final_result.get("verdict", "REJECTED"))
        score = int(final_result.get("score", 0))
        missing_criteria = final_result.get("missing_criteria", [])
        if not isinstance(missing_criteria, list):
            missing_criteria = []
        reasoning = str(final_result.get("reasoning", ""))

        # Update bounty state
        bounty.verdict = verdict
        bounty.score = u256(score)
        bounty.status = verdict
        bounty.missing_criteria_json = json.dumps(missing_criteria)
        bounty.reasoning = reasoning
        self.bounties[bid] = bounty

        # Update contributor reputation stats
        contrib_key = bounty.contributor.lower()
        if contrib_key in self.contributor_stats:
            stats = self.contributor_stats[contrib_key]
            appr = int(stats.approved_bounties)
            rej = int(stats.rejected_bounties)
            tot_score = int(stats.total_score)
            tot_earned = int(stats.total_earned)

            if verdict == "APPROVED":
                appr += 1
                tot_score += score
                tot_earned += int(bounty.reward_amount)
            elif verdict == "REJECTED":
                rej += 1
                tot_score += score

            total_rated = appr + rej
            avg = (tot_score // total_rated) if total_rated > 0 else 0

            stats.approved_bounties = u256(appr)
            stats.rejected_bounties = u256(rej)
            stats.total_score = u256(tot_score)
            stats.avg_score = u256(avg)
            stats.total_earned = u256(tot_earned)
            self.contributor_stats[contrib_key] = stats

        return {
            "verdict": verdict,
            "score": score,
            "missing_criteria": missing_criteria,
            "reasoning": reasoning,
        }

    @gl.public.write
    def expire_and_refund(self, bounty_id: int) -> None:
        bid = u256(bounty_id)
        if bid not in self.bounties:
            raise gl.vm.UserError(f"Bounty {bounty_id} does not exist")

        bounty = self.bounties[bid]
        if bounty.status not in ["OPEN", "CLAIMED", "REVISION_NEEDED"]:
            raise gl.vm.UserError(
                f"Cannot expire bounty with status '{bounty.status}' (must be OPEN, CLAIMED, or REVISION_NEEDED)"
            )

        now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
        if now <= int(bounty.deadline_ts):
            raise gl.vm.UserError("Deadline timestamp has not passed yet")

        bounty.status = "EXPIRED"
        bounty.reasoning = "Bounty expired past deadline without approved submission. Funds refunded to sponsor."
        self.bounties[bid] = bounty

    # -------------------------------------------------------------------------
    # Public View Methods
    # -------------------------------------------------------------------------

    @gl.public.view
    def get_bounty(self, bounty_id: int) -> dict:
        bid = u256(bounty_id)
        if bid not in self.bounties:
            raise gl.vm.UserError(f"Bounty {bounty_id} does not exist")
        return self._bounty_to_dict(self.bounties[bid])

    @gl.public.view
    def get_all_bounties(self) -> list[dict]:
        result = []
        for bid in self.bounty_ids:
            if bid in self.bounties:
                result.append(self._bounty_to_dict(self.bounties[bid]))
        return result

    @gl.public.view
    def get_contributor_stats(self, contributor: str) -> dict:
        key = contributor.lower()
        if key in self.contributor_stats:
            return self._stats_to_dict(self.contributor_stats[key])
        return {
            "contributor": contributor,
            "approved_bounties": 0,
            "rejected_bounties": 0,
            "total_score": 0,
            "avg_score": 0,
            "total_earned": 0,
        }

    @gl.public.view
    def get_leaderboard(self) -> list[dict]:
        leaderboard = []
        for key in self.known_contributors:
            if key in self.contributor_stats:
                leaderboard.append(self._stats_to_dict(self.contributor_stats[key]))

        leaderboard.sort(key=lambda s: (s["avg_score"], s["approved_bounties"], s["total_earned"]), reverse=True)
        return leaderboard
