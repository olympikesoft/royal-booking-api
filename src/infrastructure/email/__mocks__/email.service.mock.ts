// src/infrastructure/email/__mocks__/email.service.mock.ts

// Define interfaces needed for the mock
interface ReservationConfirmationData {
  userName: string;
  bookTitle: string;
  dueDate: Date;
  reservationId: string;
}

interface ReturnConfirmationData {
  userName: string;
  bookTitle: string;
  returnDate: Date;
  lateFee: number;
}

interface DueReminderData {
  userName: string;
  bookTitle: string;
  dueDate: Date;
  reservationId: string;
}

interface LateReminderData {
  userName: string;
  bookTitle: string;
  dueDate: Date;
  reservationId: string;
  lateFee: number;
}

interface PurchaseConversionData {
  userName: string;
  bookTitle: string;
  purchaseAmount: number;
  reservationId: string;
}

// Interface to track email info for testing
interface SentEmail {
  to: string;
  subject: string;
  body: string;
  data: any;
}

// Mocked methods as Jest functions
export const mockSendReservationConfirmation = jest.fn();
export const mockSendReturnConfirmation = jest.fn();
export const mockSendDueReminder = jest.fn();
export const mockSendLateReminder = jest.fn();
export const mockSendPurchaseConversion = jest.fn();
export const mockSendEmail = jest.fn(); // Generic method for internal use

// Mock EmailService implementation
export class MockEmailService {
  private sentEmails: SentEmail[] = [];

  // Clear the record of sent emails (useful in beforeEach)
  clearSentEmails(): void {
    this.sentEmails = [];
    mockSendReservationConfirmation.mockClear();
    mockSendReturnConfirmation.mockClear();
    mockSendDueReminder.mockClear();
    mockSendLateReminder.mockClear();
    mockSendPurchaseConversion.mockClear();
    mockSendEmail.mockClear();
  }

  // Get all emails sent for verification in tests
  getSentEmails(): SentEmail[] {
    return this.sentEmails;
  }

  // Internal helper to record sent emails
  private recordEmail(to: string, subject: string, body: string, data: any): void {
    this.sentEmails.push({ to, subject, body, data });
  }

  // Implementation of the public methods from the real EmailService
  async sendReservationConfirmation(
    email: string,
    data: ReservationConfirmationData
  ): Promise<void> {
    const subject = 'Book Reservation Confirmation - Royal Library of Belgium';
    const body = `Reservation confirmation for ${data.bookTitle} due on ${data.dueDate.toLocaleDateString()}`;
    
    this.recordEmail(email, subject, body, data);
    mockSendReservationConfirmation(email, data);
    return Promise.resolve();
  }

  async sendReturnConfirmation(
    email: string,
    data: ReturnConfirmationData
  ): Promise<void> {
    const subject = 'Book Return Confirmation - Royal Library of Belgium';
    const body = `Return confirmation for ${data.bookTitle} returned on ${data.returnDate.toLocaleDateString()}`;
    
    this.recordEmail(email, subject, body, data);
    mockSendReturnConfirmation(email, data);
    return Promise.resolve();
  }

  async sendDueReminder(
    email: string,
    data: DueReminderData
  ): Promise<void> {
    const subject = `Reminder: Book due on ${data.dueDate.toLocaleDateString()}`;
    const body = `Dear ${data.userName}, the book "${data.bookTitle}" is due on ${data.dueDate.toLocaleDateString()}`;
    
    this.recordEmail(email, subject, body, data);
    mockSendDueReminder(email, data);
    mockSendEmail(email, subject, body); // Also call the generic method for flexibility in tests
    return Promise.resolve();
  }

  async sendLateReminder(
    email: string,
    data: LateReminderData
  ): Promise<void> {
    const subject = 'Overdue Book Reminder';
    const body = `Dear ${data.userName}, the book "${data.bookTitle}" was due on ${data.dueDate.toLocaleDateString()}. Current late fee: €${data.lateFee.toFixed(2)}`;
    
    this.recordEmail(email, subject, body, data);
    mockSendLateReminder(email, data);
    mockSendEmail(email, subject, body); // Also call the generic method for flexibility in tests
    return Promise.resolve();
  }

  async sendPurchaseConversion(
    email: string,
    data: PurchaseConversionData
  ): Promise<void> {
    const subject = 'Book Purchase Conversion - Royal Library of Belgium';
    const body = `Due to accumulated late fees, the book "${data.bookTitle}" has been converted to a purchase for €${data.purchaseAmount.toFixed(2)}`;
    
    this.recordEmail(email, subject, body, data);
    mockSendPurchaseConversion(email, data);
    return Promise.resolve();
  }
}