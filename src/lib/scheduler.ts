import { runSlaCheck } from "@/lib/workflow";

let cronStarted = false;

export async function startScheduler() {
  if (cronStarted || process.env.NODE_ENV === "test") return;
  cronStarted = true;

  const cron = await import("node-cron");

  cron.default.schedule("*/5 * * * *", async () => {
    try {
      const results = await runSlaCheck();
      if (results.delayed + results.deadlineSoon + results.stuck > 0) {
        console.log("[Scheduler] SLA check:", results);
      }
    } catch (error) {
      console.error("[Scheduler Error]", error);
    }
  });

  console.log("[Scheduler] Started — SLA check every 5 minutes");
}
