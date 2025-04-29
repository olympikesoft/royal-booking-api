// src/interfaces/IScheduler.ts
export interface IScheduler {
  /**
   * Starts all configured background jobs.
   */
  startJobs(): void;

  stopJobs?(): void;
}