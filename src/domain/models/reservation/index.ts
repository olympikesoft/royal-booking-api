export enum ReservationStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
  LATE = "LATE",
  CONVERTED_TO_PURCHASE = "CONVERTED_TO_PURCHASE",
}

export interface ReservationProps {
  id?: string;
  userId: string;
  bookId: string;
  status: ReservationStatus;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  fee: number;
  lateFee: number;
  reminderSent: boolean;
  lateReminderSent: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Reservation {
  private props: ReservationProps;
  private static RESERVATION_FEE = 3;
  private static LATE_FEE_PER_DAY = 0.2;
  private static STANDARD_BORROW_DAYS = 7;

  constructor(props: ReservationProps) {
    this.props = {
      ...props,
      status: props.status || ReservationStatus.PENDING,
      fee: props.fee || Reservation.RESERVATION_FEE,
      lateFee: props.lateFee || 0,
      reminderSent: props.reminderSent || false,
      lateReminderSent: props.lateReminderSent || false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get bookId(): string {
    return this.props.bookId;
  }

  get status(): ReservationStatus {
    return this.props.status;
  }

  get borrowDate(): Date {
    return this.props.borrowDate;
  }

  get dueDate(): Date {
    return this.props.dueDate;
  }

  get returnDate(): Date | undefined {
    return this.props.returnDate;
  }

  get fee(): number {
    return this.props.fee;
  }

  get lateFee(): number {
    return this.props.lateFee;
  }

  get reminderSent(): boolean {
    return this.props.reminderSent;
  }

  get lateReminderSent(): boolean {
    return this.props.lateReminderSent;
  }

  get createdAt(): Date {
    return this.props.createdAt as Date;
  }

  get updatedAt(): Date {
    return this.props.updatedAt as Date;
  }

  get totalFee(): number {
    return this.props.fee + this.props.lateFee;
  }

  static createNew(userId: string, bookId: string): Reservation {
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Reservation.STANDARD_BORROW_DAYS);

    return new Reservation({
      userId,
      bookId,
      status: ReservationStatus.PENDING,
      borrowDate,
      dueDate,
      fee: Reservation.RESERVATION_FEE,
      lateFee: 0,
      reminderSent: false,
      lateReminderSent: false,
    });
  }

  activate(): void {
    if (this.props.status !== ReservationStatus.PENDING) {
      throw new Error("Only pending reservations can be activated");
    }

    this.props.status = ReservationStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  markAsReturned(): void {
    if (
      this.props.status !== ReservationStatus.ACTIVE &&
      this.props.status !== ReservationStatus.LATE
    ) {
      throw new Error("Only active or late reservations can be returned");
    }

    const returnDate = new Date();
    this.props.returnDate = returnDate;
    this.props.status = ReservationStatus.RETURNED;
    this.props.updatedAt = returnDate;

    // Calculate late fee if returned after due date
    if (returnDate > this.props.dueDate) {
      const daysLate = Math.ceil(
        (returnDate.getTime() - this.props.dueDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      this.props.lateFee = daysLate * Reservation.LATE_FEE_PER_DAY;
    }
  }

  markAsLate(): void {
    if (
      this.props.status === ReservationStatus.RETURNED ||
      this.props.status === ReservationStatus.CONVERTED_TO_PURCHASE
    ) {
      return;
    }

    // Update status to LATE
    this.props.status = ReservationStatus.LATE;

    // Calculate and update the late fee
    this.props.lateFee = this.calculateCurrentLateFee();

    // Update the timestamp
    this.props.updatedAt = new Date();
  }

  convertToPurchase(bookRetailPrice: number): void {
    if (this.props.status !== ReservationStatus.LATE) {
      throw new Error("Only late reservations can be converted to purchase");
    }

    const today = new Date();
    const daysLate = Math.ceil(
      (today.getTime() - this.props.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const currentLateFee = daysLate * Reservation.LATE_FEE_PER_DAY;

    if (currentLateFee >= bookRetailPrice) {
      this.props.status = ReservationStatus.CONVERTED_TO_PURCHASE;
      this.props.lateFee = bookRetailPrice;
      this.props.updatedAt = today;
    } else {
      throw new Error(
        "Late fees have not reached the retail price of the book yet"
      );
    }
  }

  /**
   * Calculates the current late fee for a reservation based on how many days it's overdue
   * @returns The late fee amount in euros
   */
  calculateCurrentLateFee(): number {
    // No late fee for returned or purchased books - use the stored value
    if (
      this.props.status === ReservationStatus.RETURNED ||
      this.props.status === ReservationStatus.CONVERTED_TO_PURCHASE
    ) {
      return this.props.lateFee;
    }
  
    // Get the current date
    const today = new Date();
  
    // If not due yet, no late fee
    if (this.props.dueDate > today) {
      return 0;
    }
  
    // Calculate how many days late the reservation is
    const daysLate = Math.ceil(
      (today.getTime() - this.props.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  
    // Calculate the late fee
    const lateFee = daysLate * Reservation.LATE_FEE_PER_DAY;
    return Math.round(lateFee * 100) / 100;
  }

  markReminderSent(): void {
    this.props.reminderSent = true;
    this.props.updatedAt = new Date();
  }

  markLateReminderSent(): void {
    this.props.lateReminderSent = true;
    this.props.updatedAt = new Date();
  }

  isDueSoon(days: number = 2): boolean {
    const today = new Date();
    const daysUntilDue = Math.ceil(
      (this.props.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDue === days;
  }

  isOverdue(days: number = 7): boolean {
    const today = new Date();
    const daysOverdue = Math.ceil(
      (today.getTime() - this.props.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysOverdue >= days;
  }

  toObject(): ReservationProps {
    return { ...this.props };
  }
}
