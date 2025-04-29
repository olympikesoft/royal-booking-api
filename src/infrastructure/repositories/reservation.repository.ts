import {
  DbTransaction,
  IReservationRepositoryInterface,
} from "../../domain/repositories/reservation-repository.interface";
import {
  Reservation,
  ReservationProps,
  ReservationStatus,
} from "../../domain/models/reservation";
import {
  ReservationModel,
  ReservationDocument,
} from "../database/schemas/reservation.schema";
import mongoose, { ClientSession } from "mongoose";

export class ReservationRepository implements IReservationRepositoryInterface {
  async beginTransaction(): Promise<ClientSession> {
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
  }

  async commitTransaction(transaction: ClientSession): Promise<void> {
    await transaction.commitTransaction();
    await transaction.endSession();
  }

  async rollbackTransaction(transaction: ClientSession): Promise<void> {
    await transaction.abortTransaction();
    await transaction.endSession();
  }
  async findById(id: string): Promise<Reservation | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const reservationDoc = await ReservationModel.findById(id);
    return reservationDoc ? this.documentToDomain(reservationDoc) : null;
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Reservation[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return [];
    }

    const skip = (page - 1) * limit;
    const reservationDocs = await ReservationModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return reservationDocs.map((doc) => this.documentToDomain(doc));
  }

  async findByBookId(
    bookId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Reservation[]> {
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return [];
    }

    const skip = (page - 1) * limit;
    const reservationDocs = await ReservationModel.find({ bookId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return reservationDocs.map((doc) => this.documentToDomain(doc));
  }

  async findByStatus(
    status: ReservationStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<Reservation[]> {
    const skip = (page - 1) * limit;
    const reservationDocs = await ReservationModel.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return reservationDocs.map((doc) => this.documentToDomain(doc));
  }

  async findActiveReservationsByUserId(userId: string): Promise<Reservation[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return [];
    }

    const activeStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.ACTIVE,
      ReservationStatus.LATE,
    ];

    const reservationDocs = await ReservationModel.find({
      userId,
      status: { $in: activeStatuses },
    });

    return reservationDocs.map((doc) => this.documentToDomain(doc));
  }

  async findActiveReservationsByBookId(bookId: string): Promise<Reservation[]> {
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return [];
    }

    const activeStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.ACTIVE,
      ReservationStatus.LATE,
    ];

    const reservationDocs = await ReservationModel.find({
      bookId,
      status: { $in: activeStatuses },
    });

    return reservationDocs.map((doc) => this.documentToDomain(doc));
  }

  async findReservationsDueSoon(days: number): Promise<Reservation[]> {
    console.log(
      `[Repository] Finding reservations due in the next ${days} days...`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999); // End of the future day

    console.log(
      `[Repository] Date range: ${today.toISOString()} to ${futureDate.toISOString()}`
    );

    try {
      const reservationDocs = await ReservationModel.find({
        status: { $in: [ReservationStatus.ACTIVE, ReservationStatus.LATE] }, // Include both ACTIVE and LATE
        dueDate: {
          $gte: today,
          $lte: futureDate,
        },
        reminderSent: false, // Only find reservations where reminder hasn't been sent
        returnDate: null, // Not returned yet
      });

      console.log(
        `[Repository] Found ${reservationDocs.length} reservations due soon`
      );
      return reservationDocs.map((doc) => this.documentToDomain(doc));
    } catch (error) {
      console.error("[Repository] Error finding reservations due soon:", error);
      throw error;
    }
  }

  async findOverdueReservations(days: number): Promise<Reservation[]> {
    console.log(
      `[Repository] Finding reservations overdue by at least ${days} days...`
    );

    const today = new Date();

    const overdueDate = new Date();
    overdueDate.setDate(today.getDate() - days);
    overdueDate.setHours(23, 59, 59, 999); // End of that day

    console.log(
      `[Repository] Looking for reservations due before: ${overdueDate.toISOString()}`
    );

    try {
      const reservationDocs = await ReservationModel.find({
        status: { $in: [ReservationStatus.ACTIVE, ReservationStatus.LATE] }, // Include both statuses
        dueDate: { $lt: overdueDate }, // Due before the cutoff date (overdue by AT LEAST 'days' days)
        lateReminderSent: false, // Only where late reminder hasn't been sent
        returnDate: null, // Not returned yet
      });

      console.log(
        `[Repository] Found ${reservationDocs.length} overdue reservations`
      );
      return reservationDocs.map((doc) => this.documentToDomain(doc));
    } catch (error) {
      console.error("[Repository] Error finding overdue reservations:", error);
      throw error;
    }
  }

  async countActiveReservationsByUserId(userId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return 0;
    }

    const activeStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.ACTIVE,
      ReservationStatus.LATE,
    ];

    return ReservationModel.countDocuments({
      userId,
      status: { $in: activeStatuses },
    });
  }

  async findLateReservations(): Promise<Reservation[]> {
    console.log(`[Repository] Finding all late reservations...`);
    
    try {
      // Look for both explicitly marked LATE and implicitly late (ACTIVE but past due date)
      const today = new Date();
      
      const reservationDocs = await ReservationModel.find({
        $or: [
          { status: ReservationStatus.LATE }, // Explicitly marked as LATE
          { 
            status: ReservationStatus.ACTIVE, 
            dueDate: { $lt: today } // Implicitly late (ACTIVE but past due date)
          }
        ],
        returnDate: null // Not returned yet
      });
      
      console.log(`[Repository] Found ${reservationDocs.length} late reservations`);
      return reservationDocs.map(doc => this.documentToDomain(doc));
    } catch (error) {
      console.error('[Repository] Error finding late reservations:', error);
      throw error;
    }
  }

  async countActiveReservationsByBookId(bookId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return 0;
    }

    const activeStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.ACTIVE,
      ReservationStatus.LATE,
    ];

    return ReservationModel.countDocuments({
      bookId,
      status: { $in: activeStatuses },
    });
  }
  async save(
    reservation: Reservation,
    transaction?: ClientSession
  ): Promise<Reservation> {
    const newReservation = new ReservationModel(
      this.domainToDocument(reservation)
    );

    if (transaction) {
      newReservation.$session(transaction);
    }

    const savedReservation = await newReservation.save();
    return this.documentToDomain(savedReservation);
  }

  async update(
    reservation: Reservation,
    transaction?: ClientSession
  ): Promise<Reservation> {
    if (!reservation.id) {
      throw new Error("Reservation ID is required for update");
    }

    const updateQuery = ReservationModel.findByIdAndUpdate(
      reservation.id,
      this.domainToDocument(reservation),
      { new: true }
    );

    if (transaction) {
      updateQuery.session(transaction);
    }

    const updatedReservationDoc = await updateQuery.exec();

    if (!updatedReservationDoc) {
      throw new Error(`Reservation with ID ${reservation.id} not found`);
    }

    return this.documentToDomain(updatedReservationDoc);
  }

  async delete(id: string, transaction?: ClientSession): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const deleteQuery = ReservationModel.deleteOne({ _id: id });

    if (transaction) {
      deleteQuery.session(transaction);
    }

    const result = await deleteQuery.exec();
    return result.deletedCount === 1;
  }

  private documentToDomain(doc: ReservationDocument): Reservation {
    const reservationProps: ReservationProps = {
      id: doc._id?.toString(),
      userId: doc.userId.toString(),
      bookId: doc.bookId.toString(),
      status: doc.status,
      borrowDate: doc.borrowDate,
      dueDate: doc.dueDate,
      returnDate: doc.returnDate,
      fee: doc.fee,
      lateFee: doc.lateFee,
      reminderSent: doc.reminderSent,
      lateReminderSent: doc.lateReminderSent,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return new Reservation(reservationProps);
  }

  private domainToDocument(reservation: Reservation): any {
    return {
      userId: reservation.userId,
      bookId: reservation.bookId,
      status: reservation.status,
      borrowDate: reservation.borrowDate,
      dueDate: reservation.dueDate,
      returnDate: reservation.returnDate,
      fee: reservation.fee,
      lateFee: reservation.lateFee,
      reminderSent: reservation.reminderSent,
      lateReminderSent: reservation.lateReminderSent,
    };
  }
}
