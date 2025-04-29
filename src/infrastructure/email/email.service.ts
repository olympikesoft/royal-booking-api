
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { config } from '../../config'; // Assuming config and its type AppConfig are exported

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

export class EmailService {
  private transporter: Mail | null = null; // Initialize as null
  private isProduction: boolean;
  private emailFrom: string;

  // Inject the application config
  constructor(private readonly appConfig = config) { // Default to imported config if not provided
    this.isProduction = this.appConfig.server.environment === 'production';
    this.emailFrom = this.appConfig.email.from;

    if (this.isProduction) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.appConfig.email.host,
          port: this.appConfig.email.port,
          secure: this.appConfig.email.secure, // true for 465, false for others like 587
          auth: {
            user: this.appConfig.email.user,
            pass: this.appConfig.email.password,
          },
        });
        console.log('EmailService: Configured for SMTP transport (Production).');
      } catch (error) {
         console.error("EmailService: Failed to create SMTP transport.", error);
      }
    } else {
      console.log(`EmailService: Configured for Console Log transport (Environment: ${this.appConfig.server.environment}).`);
    }
  }

  private async sendOrLog(mailOptions: Mail.Options): Promise<void> {
    if (this.isProduction && this.transporter) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${mailOptions.to}: ${info.messageId}`);
      } catch (error) {
        console.error(`Error sending email to ${mailOptions.to}:`, error);
        throw new Error(`Failed to send email: ${error}`);
      }
    } else {
      console.log('\n--- EMAIL TO CONSOLE ---');
      console.log(`To: ${mailOptions.to}`);
      console.log(`From: ${mailOptions.from}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('--- HTML Body ---');
      console.log(mailOptions.html || '(No HTML body)');
      console.log('------------------------\n');
      return Promise.resolve();
    }
  }

  // --- Public Email Sending Methods ---

  async sendReservationConfirmation(
    email: string,
    data: ReservationConfirmationData
  ): Promise<void> {
    const formattedDueDate = data.dueDate.toLocaleDateString(); // Consider locale options if needed
    const html = `
        <h1>Reservation Confirmation</h1>
        <p>Dear ${data.userName},</p>
        <p>Thank you for your reservation. Please find the details below:</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Due Date:</strong> ${formattedDueDate}</p>
        <p><strong>Reservation ID:</strong> ${data.reservationId}</p>
        <p>Please remember to return the book by the due date to avoid late fees.</p>
        <p>Best regards,<br>Royal Library of Belgium</p>
      `;

    await this.sendOrLog({
      from: this.emailFrom,
      to: email,
      subject: 'Book Reservation Confirmation - Royal Library of Belgium',
      html: html,
    });
  }

  async sendReturnConfirmation(
    email: string,
    data: ReturnConfirmationData
  ): Promise<void> {
    const formattedReturnDate = data.returnDate.toLocaleDateString();
    const html = `
        <h1>Return Confirmation</h1>
        <p>Dear ${data.userName},</p>
        <p>Thank you for returning the book. Please find the details below:</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Return Date:</strong> ${formattedReturnDate}</p>
        ${data.lateFee > 0 ? `<p><strong>Late Fee Applied:</strong> €${data.lateFee.toFixed(2)}</p>` : ''}
        <p>Thank you for using our services.</p>
        <p>Best regards,<br>Royal Library of Belgium</p>
      `;

      await this.sendOrLog({
          from: this.emailFrom,
          to: email,
          subject: 'Book Return Confirmation - Royal Library of Belgium',
          html: html,
      });
  }

  async sendDueReminder(
    email: string,
    data: DueReminderData
  ): Promise<void> {
    const formattedDueDate = data.dueDate.toLocaleDateString();
    const html = `
        <h1>Book Due Soon Reminder</h1>
        <p>Dear ${data.userName},</p>
        <p>This is a friendly reminder that the following book is due in 2 days:</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Due Date:</strong> ${formattedDueDate}</p>
        <p><strong>Reservation ID:</strong> ${data.reservationId}</p>
        <p>Please return the book by the due date to avoid late fees of €0.20 per day.</p>
        <p>Best regards,<br>Royal Library of Belgium</p>
      `;

      await this.sendOrLog({
          from: this.emailFrom,
          to: email,
          subject: 'Book Due Reminder - Royal Library of Belgium',
          html: html,
      });
  }

  async sendLateReminder(
    email: string,
    data: LateReminderData
  ): Promise<void> {
    const formattedDueDate = data.dueDate.toLocaleDateString();
    const html = `
        <h1>Overdue Book Reminder</h1>
        <p>Dear ${data.userName},</p>
        <p>Our records show that you have an overdue book:</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Original Due Date:</strong> ${formattedDueDate}</p>
        <p><strong>Current Late Fee:</strong> €${data.lateFee.toFixed(2)}</p>
        <p><strong>Reservation ID:</strong> ${data.reservationId}</p>
        <p>Please return the book as soon as possible to avoid additional late fees.</p>
        <p>A late fee of €0.20 per day is being applied until the book is returned.</p>
        <p>Best regards,<br>Royal Library of Belgium</p>
      `;

      await this.sendOrLog({
          from: this.emailFrom,
          to: email,
          subject: 'Overdue Book Reminder - Royal Library of Belgium',
          html: html,
      });
  }

  async sendPurchaseConversion(
    email: string,
    data: PurchaseConversionData
  ): Promise<void> {
      const html = `
        <h1>Book Purchase Notification</h1>
        <p>Dear ${data.userName},</p>
        <p>Due to accumulated late fees exceeding the book's value, the following book has been converted to a purchase:</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Purchase Amount (Charged):</strong> €${data.purchaseAmount.toFixed(2)}</p>
        <p><strong>Original Reservation ID:</strong> ${data.reservationId}</p>
        <p>The book is now yours to keep. This amount has been charged to your library wallet.</p>
        <p>Best regards,<br>Royal Library of Belgium</p>
      `;

      await this.sendOrLog({
          from: this.emailFrom,
          to: email,
          subject: 'Book Purchase Conversion - Royal Library of Belgium',
          html: html,
      });
  }
}