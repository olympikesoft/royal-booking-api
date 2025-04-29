import { ReservationService } from '../../application/services/reservation.service'; // Adjust path as needed
import cron from 'node-cron';
import { IScheduler } from '../../interfaces/jobs';
import { config } from '../../config';

export class SchedulerService implements IScheduler {
  private readonly jobs: cron.ScheduledTask[] = []; 

  constructor(private readonly reservationService: ReservationService) {}

  /**
   * Starts all scheduled jobs defined in this service.
   * Implements the IScheduler interface.
   */
  public startJobs(): void {
    console.log('Starting scheduled jobs...');
    this.jobs.push(this.scheduleDueReminders());
    this.jobs.push(this.scheduleLateReminders());
    this.jobs.push(this.scheduleBookPurchaseCheck());
    console.log(`Scheduled ${this.jobs.length} jobs.`);
  }

  /**
   * Stops all running jobs (if needed for graceful shutdown).
   */
  public stopJobs(): void {
     console.log('Stopping scheduled jobs...');
     this.jobs.forEach(job => job.stop());
     console.log('Scheduled jobs stopped.');
  }


  // --- Private methods defining the specific jobs ---

  private scheduleDueReminders(): cron.ScheduledTask {
    return cron.schedule(config.schedule.CRON_DUE_REMINDERS, async () => { // Use schedule from config
      const jobName = 'Due Reminders';
      console.log(`[Scheduler] Running job: ${jobName}`);
      try {
        const count = await this.reservationService.sendDueReminders();
        console.log(`[Scheduler] Job ${jobName} finished: Sent ${count} reminders.`);
      } catch (error) {
        console.error(`[Scheduler] Error in job ${jobName}:`, error);
      }
    }, {
      scheduled: true, // Ensure it starts immediately
      timezone: "Europe/Paris" // Example: Set your timezone
    });
  }

  private scheduleLateReminders(): cron.ScheduledTask {
    return cron.schedule(config.schedule.CRON_LATE_REMINDERS, async () => { // Use schedule from config
      const jobName = 'Late Reminders';
      console.log(`[Scheduler] Running job: ${jobName}`);
      try {
        const count = await this.reservationService.sendLateReminders();
        console.log(`[Scheduler] Job ${jobName} finished: Sent ${count} reminders.`);
      } catch (error) {
        console.error(`[Scheduler] Error in job ${jobName}:`, error);
      }
    }, {
        scheduled: true,
        timezone: "Europe/Paris" // Example: Set your timezone
    });
  }

  private scheduleBookPurchaseCheck(): cron.ScheduledTask {
    return cron.schedule(config.schedule.CRON_PURCHASE_CHECK, async () => { 
      const jobName = 'Book Purchase Conversion';
      console.log(`[Scheduler] Running job: ${jobName}`);
      try {
        const count = await this.reservationService.checkForBooksToPurchase();
        console.log(`[Scheduler] Job ${jobName} finished: Converted ${count} books to purchases.`);
      } catch (error) {
        console.error(`[Scheduler] Error in job ${jobName}:`, error);
      }
    }, {
        scheduled: true,
        timezone: "Europe/Lisbon" 
    });
  }
}
