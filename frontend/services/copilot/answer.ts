import { mockCandidates, getCandidateDisplayStatus } from "@/services/mock/candidates";
import { getApprovalsForTarget } from "@/services/mock/approvals";
import { mockAnomalies } from "@/services/mock/ai-governance";
import { mockElections, getComputedLifecycleStatus } from "@/services/mock/elections";

export interface CopilotAnswer {
  text: string;
  isDeclined: boolean;
}

const ACTION_VERBS = ["approve", "reject", "activate", "close", "delete", "publish", "cancel", "override"];

export function answerCopilotQuestion(question: string): CopilotAnswer {
  const q = question.toLowerCase();

  // Refuse anything phrased as an instruction to act, not a question to answer.
  if (ACTION_VERBS.some((v) => q.includes(v))) {
    return {
      isDeclined: true,
      text: "I can't perform that action. Approvals, activations, and closures require authorized human action through the DAT approval workflow — I can only answer questions about current status.",
    };
  }

  // Candidate status lookups: "why is jane wanjiku pending"
  const matchedCandidate = mockCandidates.find((c) => q.includes(c.name.toLowerCase()));
  if (matchedCandidate) {
    const approval = getApprovalsForTarget(matchedCandidate.id).find((a) => a.status === "PENDING" || a.status === "APPROVED");
    const displayStatus = getCandidateDisplayStatus(matchedCandidate.id, Boolean(approval && approval.status === "PENDING"));
    if (displayStatus === "Awaiting Approval" && approval) {
      const approvedCount = approval.stages.filter((s) => s.status === "APPROVED").length;
      return {
        isDeclined: false,
        text: `${matchedCandidate.name}'s eligibility review is complete, and the candidate is awaiting the Administrator's co-approval (DAT ${approvedCount}/${approval.stages.length}).`,
      };
    }
    return { isDeclined: false, text: `${matchedCandidate.name} is currently ${displayStatus.toLowerCase()}.` };
  }

  // Aggregate: "how many candidates are awaiting approval"
  if (q.includes("awaiting approval") || q.includes("awaiting dat") || (q.includes("how many") && q.includes("candidate"))) {
    const count = mockCandidates.filter((c) => {
      const approval = getApprovalsForTarget(c.id).find((a) => a.status === "PENDING");
      return Boolean(approval);
    }).length;
    return { isDeclined: false, text: `There are ${count} candidate(s) currently awaiting the second DAT approval.` };
  }

  // Risk/anomaly lookups: "are there any unusual activities"
  if (q.includes("unusual") || q.includes("anomal") || q.includes("risk")) {
    if (mockAnomalies.length === 0) {
      return { isDeclined: false, text: "No anomalies have been detected." };
    }
    const summary = mockAnomalies.map((a) => `${a.severity.toLowerCase()}-risk: ${a.description}`).join("; ");
    return { isDeclined: false, text: `${mockAnomalies.length} anomaly event(s) detected — ${summary}.` };
  }

  // Election status: "what is the status of the 2026 general election"
  const matchedElection = mockElections.find((e) => q.includes(e.title.toLowerCase()));
  if (matchedElection) {
    return { isDeclined: false, text: `${matchedElection.title} is currently ${getComputedLifecycleStatus(matchedElection).toLowerCase()}.` };
  }

  return {
    isDeclined: false,
    text: "I don't have enough information to answer that from current election, candidate, approval, and audit data. Try asking about a specific candidate, election, or pending approvals.",
  };
}