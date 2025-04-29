// src/application/services/reservation.service.ts
import {
  DbTransaction,
  IReservationRepositoryInterface,
} from "../../domain/repositories/reservation-repository.interface";
import { IBookRepositoryInterface } from "../../domain/repositories/book-repository.interface";
import { IUserRepositoryInterface } from "../../domain/repositories/user-repository.interface";
import { IWalletRepositoryInterface } from "../../domain/repositories/wallet-repository.interface";
import {
  Reservation,
  ReservationProps,
  ReservationStatus,
} from "../../domain/models/reservation";
import { EmailService } from "../../infrastructure/email/email.service";

export class ReservationService {
  constructor(
    private reservationRepository: IReservationRepositoryInterface,
    private bookRepository: IBookRepositoryInterface,
    private userRepository: IUserRepositoryInterface,
    private walletRepository: IWalletRepositoryInterface,
    private emailService: EmailService
  ) {}

  async findById(id: string): Promise<Reservation | null> {
    return this.reservationRepository.findById(id);
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Reservation[]> {
    return this.reservationRepository.findByUserId(userId, page, limit);
  }

  async findByBookId(
    bookId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Reservation[]> {
    return this.reservationRepository.findByBookId(bookId, page, limit);
  }

  async findByStatus(
    status: ReservationStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<Reservation[]> {
    return this.reservationRepository.findByStatus(status, page, limit);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<Reservation[]> {
    const activeReservations = await this.reservationRepository.findByStatus(
      ReservationStatus.ACTIVE,
      page,
      limit
    );
    const pendingReservations = await this.reservationRepository.findByStatus(
      ReservationStatus.PENDING,
      page,
      limit
    );
    const lateReservations = await this.reservationRepository.findByStatus(
      ReservationStatus.LATE,
      page,
      limit
    );

    return [...activeReservations, ...pendingReservations, ...lateReservations];
  }

  async createReservation(
    userId: string,
    bookId: string
  ): Promise<Reservation> {
    // let transaction: DbTransaction | undefined;
    let emailData: any; // To store data for email sending outside the transaction

    try {
      // transaction = await this.reservationRepository.beginTransaction();

      // --- Start Transactional Opexrations ---

      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }
      if (!user.isActive) {
        throw new Error("User account is not active");
      }

      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        throw new Error("Book not found");
      }
      if (!book.isAvailable()) {
        throw new Error("Book is not available for reservation");
      }

      const activeReservations =
        await this.reservationRepository.findActiveReservationsByUserId(userId);
      const hasBook = activeReservations.some((r) => r.bookId === bookId);
      if (hasBook) {
        throw new Error("User already has this book");
      }

      // 4. Check if user has reached the maximum number of books (3)
      if (activeReservations.length >= 3) {
        throw new Error(
          "User has reached the maximum number of books allowed (3)"
        );
      }

      const wallet = await this.walletRepository.findByUserId(userId);
      if (!wallet) {
        // Or potentially create a wallet if business logic allows
        throw new Error("Wallet not found");
      }
      const reservationFee = 3; // 3 euros per reservation
      if (!wallet.hasEnoughFunds(reservationFee)) {
        throw new Error("Insufficient funds");
      }

      // 6. Create the reservation entity (in memory)
      const reservation = Reservation.createNew(userId, bookId);

      // 7. Deduct the reservation fee from wallet
      wallet.withdraw(reservationFee);
      await this.walletRepository.update(wallet); // Pass transaction

      // 8. Update book availability
      book.borrowCopy();
      await this.bookRepository.update(book);

      reservation.activate();

      // 10. Save the reservation entity to DB
      const savedReservation = await this.reservationRepository.save(
        reservation
      ); // Pass transaction

      emailData = {
        userEmail: user.email,
        userName: user.name,
        bookTitle: book.title,
        dueDate: savedReservation.dueDate,
        reservationId: savedReservation.id as string,
      };

      // await this.reservationRepository.commitTransaction(transaction);
      //transaction = undefined; // Mark transaction as completed

      await this.emailService.sendReservationConfirmation(emailData.userEmail, {
        userName: emailData.userName,
        bookTitle: emailData.bookTitle,
        dueDate: emailData.dueDate,
        reservationId: emailData.reservationId,
      });

      return savedReservation;
    } catch (error) {
      // Rollback transaction if it was started and an error occurred
      //if (transaction) {
      //  await this.reservationRepository.rollbackTransaction(transaction);
      // }
      console.error("Error creating reservation:", error);
      // Rethrow the error to be handled by the caller (e.g., controller)
      throw error;
    }
  }

  async returnBook(reservationId: string): Promise<Reservation | null> {
    // let transaction: DbTransaction | undefined;
    let emailInfo: {
      userEmail: string;
      userName: string;
      bookTitle: string;
      returnDate: Date;
      lateFee: number;
    } | null = null;

    try {
      //   transaction = await this.reservationRepository.beginTransaction();

      // --- Start Transactional Operations ---

      // 1. Find the reservation
      const reservation = await this.reservationRepository.findById(
        reservationId
      );
      if (!reservation) {
        // No reservation found, no need to rollback an empty transaction potentially
        //   await this.reservationRepository.rollbackTransaction(transaction); // Or commit if no-op is fine
        return null;
      }

      // 2. Check if it can be returned
      if (
        reservation.status === ReservationStatus.RETURNED ||
        reservation.status === ReservationStatus.CONVERTED_TO_PURCHASE
      ) {
        throw new Error("Book has already been returned or purchased");
      }

      // 3. Mark as returned and calculate any late fees (in memory)
      reservation.markAsReturned();
      const lateFee = reservation.lateFee; // Get the calculated fee

      if (lateFee > 0) {
        // Assuming findByUserIdWithLock exists for wallet
        const wallet = await this.walletRepository.findByUserId(
          reservation.userId
        );
        if (!wallet) {
          throw new Error(
            `Wallet not found for user ${reservation.userId} to deduct late fee.`
          );
        }
        try {
          wallet.withdraw(lateFee);
          await this.walletRepository.update(wallet); // Pass transaction
        } catch (error: any) {
          console.error(
            `User ${reservation.userId} has insufficient funds for late fee: ${lateFee}. Error: ${error.message}`
          );
          throw new Error(`Insufficient funds to pay late fee of ${lateFee}.`); // Causes rollback
        }
      }

      const book = await this.bookRepository.findById(reservation.bookId);
      if (book) {
        if (book && reservation.lateFee >= book.retailPrice) {
          reservation.convertToPurchase(book.retailPrice);
          book.borrowCopy();
        } else {
          book.returnCopy();
        }
        await this.bookRepository.update(book);
      } else {
        // Log this inconsistency but might proceed with reservation update
        console.warn(
          `Book with ID ${reservation.bookId} not found while returning reservation ${reservationId}.`
        );
        // Decide if this should cause a rollback. Maybe not if the primary goal is updating the reservation.
      }

      const updatedReservation = await this.reservationRepository.update(
        reservation
      ); // Pass transaction

      const user = await this.userRepository.findById(reservation.userId); // Read user (no lock needed just for email)
      if (user && book) {
        emailInfo = {
          userEmail: user.email,
          userName: user.name,
          bookTitle: book.title,
          returnDate: updatedReservation.returnDate as Date,
          lateFee: updatedReservation.lateFee,
        };
      }

      // --- End Transactional Operations ---

      //await this.reservationRepository.commitTransaction(transaction);
      //transaction = undefined;

      // 8. Send return confirmation email - AFTER transaction commit
      if (emailInfo) {
        await this.emailService.sendReturnConfirmation(emailInfo.userEmail, {
          userName: emailInfo.userName,
          bookTitle: emailInfo.bookTitle,
          returnDate: emailInfo.returnDate,
          lateFee: emailInfo.lateFee,
        });
      }

      return updatedReservation;
    } catch (error) {
      //if (transaction) {
      //    await this.reservationRepository.rollbackTransaction(transaction);
      // }
      console.error(
        `Error returning book for reservation ${reservationId}:`,
        error
      );
      if (
        error instanceof Error &&
        error.message.startsWith("Book has already been returned")
      ) {
        return null;
      }
      throw error;
    }
  }

  async findReservationsDueSoon(days: number = 2): Promise<Reservation[]> {
    return this.reservationRepository.findReservationsDueSoon(days);
  }

  async findOverdueReservations(days: number = 7): Promise<Reservation[]> {
    return this.reservationRepository.findOverdueReservations(days);
  }

  async findLateReservations(): Promise<Reservation[]> {
    return this.reservationRepository.findLateReservations();
  }

  async update(
    id: string,
    reservationData: Partial<Reservation>
  ): Promise<Reservation | null> {
    const existingReservation = await this.reservationRepository.findById(id);

    if (!existingReservation) {
      return null;
    }

    const updatedReservationData = {
      ...existingReservation.toObject(),
      ...reservationData,
      id,
    };
    const updatedUser = new Reservation(updatedReservationData);

    return this.reservationRepository.update(updatedUser);
  }

  async sendDueReminders(): Promise<number> {
    console.log("[Scheduler] Starting sendDueReminders job...");

    // First, ensure all reservation statuses are up-to-date
    await this.updateOverdueReservationStatuses();

    const dueReservations = await this.findReservationsDueSoon(2);
    console.log(
      `[Scheduler] Found ${dueReservations.length} reservations due in the next 2 days`
    );

    if (dueReservations.length > 0) {
      // Log sample reservation for debugging
      const sample = dueReservations[0];
      console.log(
        `[Scheduler] Sample due reservation: ID=${
          sample.id
        }, DueDate=${sample.dueDate?.toISOString()}`
      );
    }

    let sentCount = 0;

    // Send reminders for each reservation
    for (const reservation of dueReservations) {
      if (reservation.reminderSent) {
        console.log(
          `[Scheduler] Skipping reservation ${reservation.id} - reminder already sent`
        );
        continue; // Skip if reminder already sent
      }

      const user = await this.userRepository.findById(reservation.userId);
      const book = await this.bookRepository.findById(reservation.bookId);

      if (user && book) {
        try {
          console.log(
            `[Scheduler] Sending due reminder to ${user.email} for book "${book.title}"`
          );

          // Send email reminder
          await this.emailService.sendDueReminder(user.email, {
            userName: user.name,
            bookTitle: book.title,
            dueDate: reservation.dueDate,
            reservationId: reservation.id as string,
          });

          // Mark reminder as sent
          reservation.markReminderSent();
          await this.reservationRepository.update(reservation);
          sentCount++;

          console.log(
            `[Scheduler] Successfully sent reminder for reservation ${reservation.id}`
          );
        } catch (error) {
          console.error(
            `[Scheduler] Error sending reminder for reservation ${reservation.id}:`,
            error
          );
        }
      } else {
        console.log(
          `[Scheduler] Could not find user or book for reservation ${reservation.id}`
        );
      }
    }

    console.log(
      `[Scheduler] Due reminders job completed. Sent ${sentCount} reminders.`
    );
    return sentCount;
  }

  /**
   * Updates status of any reservations that are overdue but still marked as ACTIVE
   * This should be called before running scheduled jobs to ensure data consistency
   */
  async updateOverdueReservationStatuses(): Promise<number> {
    console.log(
      "[Scheduler] Pre-processing: Checking for overdue reservations marked as ACTIVE..."
    );

    try { 
      // Get all ACTIVE reservations
      const activeReservations = await this.reservationRepository.findByStatus(
        ReservationStatus.ACTIVE,
        1,
        1000
      );
      console.log(
        `[Scheduler] Found ${activeReservations.length} ACTIVE reservations total`
      );

      // Filter to find overdue ones
      const today = new Date();
      const overdueActiveReservations = activeReservations.filter(
        (res) => res.dueDate && res.dueDate < today && !res.returnDate
      );

      console.log(
        `[Scheduler] Found ${overdueActiveReservations.length} ACTIVE reservations that are overdue`
      );

      if (overdueActiveReservations.length === 0) {
        return 0;
      }

      // Update them to LATE status
      let updatedCount = 0;
      for (const reservation of overdueActiveReservations) {
        try {
          // Calculate current late fee and set status to LATE
          reservation.markAsLate();
          await this.reservationRepository.update(reservation);
          updatedCount++;
        } catch (error) {
          console.error(
            `[Scheduler] Error updating reservation ${reservation.id} status:`,
            error
          );
        }
      }

      console.log(
        `[Scheduler] Updated ${updatedCount} reservations from ACTIVE to LATE`
      );
      return updatedCount;
    } catch (error) {
      console.error(
        "[Scheduler] Error updating overdue reservation statuses:",
        error
      );
      return 0;
    }
  }

  async sendLateReminders(): Promise<number> {
    console.log("[Scheduler] Starting sendLateReminders job...");

    // First, ensure all reservation statuses are up-to-date
    await this.updateOverdueReservationStatuses();

    // Find reservations overdue by 7 days
    const lateReservations = await this.findOverdueReservations(7);
    console.log(
      `[Scheduler] Found ${lateReservations.length} reservations overdue by at least 7 days`
    );

    if (lateReservations.length > 0) {
      // Log sample reservation for debugging
      const sample = lateReservations[0];
      console.log(
        `[Scheduler] Sample overdue reservation: ID=${
          sample.id
        }, DueDate=${sample.dueDate?.toISOString()}`
      );
    }

    let sentCount = 0;

    // Send reminders for each reservation
    for (const reservation of lateReservations) {
      if (reservation.lateReminderSent) {
        console.log(
          `[Scheduler] Skipping reservation ${reservation.id} - late reminder already sent`
        );
        continue; // Skip if late reminder already sent
      }

      const user = await this.userRepository.findById(reservation.userId);
      const book = await this.bookRepository.findById(reservation.bookId);

      if (user && book) {
        try {
          const lateFee = reservation.calculateCurrentLateFee();
          console.log(
            `[Scheduler] Calculated late fee for reservation ${reservation.id}: ${lateFee}€`
          );

          // Send email reminder
          console.log(
            `[Scheduler] Sending late reminder to ${user.email} for book "${book.title}"`
          );
          await this.emailService.sendLateReminder(user.email, {
            userName: user.name,
            bookTitle: book.title,
            dueDate: reservation.dueDate,
            reservationId: reservation.id as string,
            lateFee,
          });

          // Mark late reminder as sent and update status to LATE
          reservation.markLateReminderSent();
          reservation.markAsLate();
          await this.reservationRepository.update(reservation);
          sentCount++;

          console.log(
            `[Scheduler] Successfully sent late reminder for reservation ${reservation.id}`
          );
        } catch (error) {
          console.error(
            `[Scheduler] Error sending late reminder for reservation ${reservation.id}:`,
            error
          );
        }
      } else {
        console.log(
          `[Scheduler] Could not find user or book for late reservation ${reservation.id}`
        );
      }
    }

    console.log(
      `[Scheduler] Late reminders job completed. Sent ${sentCount} reminders.`
    );
    return sentCount;
  }

  async checkForBooksToPurchase(): Promise<number> {
    console.log("[Scheduler] Starting checkForBooksToPurchase job...");

    // First, ensure all reservation statuses are up-to-date
    await this.updateOverdueReservationStatuses();

    // Find all late reservations
    const lateReservations = await this.findLateReservations();
    console.log(
      `[Scheduler] Found ${lateReservations.length} late reservations`
    );

    if (lateReservations.length > 0) {
      // Log sample reservation for debugging
      const sample = lateReservations[0];
      console.log(
        `[Scheduler] Sample late reservation: ID=${sample.id}, Status=${sample.status}, LateFee=${sample.lateFee}€`
      );
    }

    let purchasedCount = 0;

    // Check each reservation if late fees exceed book price
    for (const reservation of lateReservations) {
      console.log(
        `[Scheduler] Processing reservation ${reservation.id} for purchase conversion`
      );

      // Skip if already converted to purchase
      if (reservation.status === ReservationStatus.CONVERTED_TO_PURCHASE) {
        console.log(
          `[Scheduler] Skipping reservation ${reservation.id} - already converted to purchase`
        );
        continue;
      }

      const book = await this.bookRepository.findById(reservation.bookId);

      if (book) {
        try {
          const currentLateFee = reservation.calculateCurrentLateFee();
          console.log(
            `[Scheduler] Book "${book.title}" price: ${book.retailPrice}€, Current late fee: ${currentLateFee}€`
          );

          if (currentLateFee >= book.retailPrice) {
            console.log(
              `[Scheduler] Converting reservation ${reservation.id} to purchase (fee exceeds book price)`
            );

            reservation.convertToPurchase(book.retailPrice);
            await this.reservationRepository.update(reservation);

            // Send purchase conversion notification
            const user = await this.userRepository.findById(reservation.userId);
            if (user) {
              console.log(
                `[Scheduler] Sending purchase conversion notification to ${user.email}`
              );
              await this.emailService.sendPurchaseConversion(user.email, {
                userName: user.name,
                bookTitle: book.title,
                purchaseAmount: book.retailPrice,
                reservationId: reservation.id as string,
              });
            } else {
              console.log(
                `[Scheduler] Could not find user for purchase conversion notification`
              );
            }

            purchasedCount++;
          } else {
            console.log(
              `[Scheduler] Late fee ${currentLateFee}€ does not exceed book price ${book.retailPrice}€ - not converting`
            );
          }
        } catch (error) {
          console.error(
            `[Scheduler] Error processing purchase conversion for reservation ${reservation.id}:`,
            error
          );
        }
      } else {
        console.log(
          `[Scheduler] Could not find book for reservation ${reservation.id}`
        );
      }
    }

    console.log(
      `[Scheduler] Purchase conversion job completed. Converted ${purchasedCount} books to purchases.`
    );
    return purchasedCount;
  }
}
