import { logger } from "../config/logger";
import { autoCloseEndedElections } from "../modules/elections/elections.service";
import { expireStaleApprovalRequests } from "../modules/approvals/approvals.service";

// In-process scheduler (handoff K5). Every SCHEDULER_INTERVAL_MS it:
//  1. closes ACTIVE elections whose end date has passed, and
//  2. marks expired PENDING approval requests as EXPIRED.
// It never activates elections: activation always needs DAT approval.
//
// Designed for ONE server instance (the single-SACCO scope). With several
// instances, enable it on one only (SCHEDULER_ENABLED=false on the others).

export interface ScheduledRunResult {
  electionsClosed: string[];
  approvalRequestsExpired: number;
}

// One pass, exported so tests can call it directly with a chosen time.
export async function runScheduledTasks(now: Date = new Date()): Promise<ScheduledRunResult> {
  const electionsClosed = await autoCloseEndedElections(now);
  const approvalRequestsExpired = await expireStaleApprovalRequests(now);

  if (electionsClosed.length > 0 || approvalRequestsExpired > 0) {
    logger.info("Scheduled tasks ran", { electionsClosed: electionsClosed.length, approvalRequestsExpired });
  }
  return { electionsClosed, approvalRequestsExpired };
}

// Starts the timer and returns a stop function for graceful shutdown. The
// stop function waits for a pass that is already running, so nothing writes
// to the database after the caller disconnects it.
export function startScheduler(intervalMs: number): () => Promise<void> {
  let inFlight: Promise<void> | null = null;

  const tick = (): Promise<void> => {
    if (inFlight) return inFlight; // a slow pass is still going; skip this tick
    inFlight = (async () => {
      try {
        await runScheduledTasks();
      } catch (err) {
        // Never crash the server over a background job; try again next tick.
        logger.error("Scheduled tasks failed", { message: err instanceof Error ? err.message : String(err) });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };

  void tick(); // catch up straight away after a restart
  const timer = setInterval(() => void tick(), intervalMs);
  logger.info("Scheduler started", { intervalMs });

  return async () => {
    clearInterval(timer);
    if (inFlight) await inFlight;
  };
}