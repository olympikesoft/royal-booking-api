import express, { Request, Response, Router } from "express";
import { ReservationService } from "../../../application/services/reservation.service";
import { validateDto } from "../middlewares/validator.middleware";
import {
  CreateReservationDTO,
  ForceDueDateDTO,
} from "../../../application/dtos/reservation.dto";
import { config } from "../../../config";
import { ReservationStatus } from "../../../domain/models/reservation";
import { UpdateBookDTO } from "../../../application/dtos/book.dto";

export class ReservationRouter {
  public router: Router;

  constructor(private reservationService: ReservationService) {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get("/", this.getAllReservations.bind(this));
    this.router.get("/:id", this.getReservationById.bind(this));
    this.router.get("/user/:userId", this.getUserReservations.bind(this));
    this.router.get("/book/:bookId", this.getBookReservations.bind(this));
    this.router.post(
      "/",
      validateDto(CreateReservationDTO),
      this.createReservation.bind(this)
    );
    this.router.post("/:id/return", this.returnBook.bind(this));
    this.router.put(
      "/:id/force-due-date",
      validateDto(ForceDueDateDTO), // Validate the request body
      this.forceDueDate.bind(this)
    );
  }

  private async getAllReservations(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit =
        parseInt(req.query.limit as string) || config.pagination.defaultLimit;
      const status = req.query.status as ReservationStatus;

      let reservations;

      if (status) {
        reservations = await this.reservationService.findByStatus(
          status,
          page,
          limit
        );
      } else {
        reservations = await this.reservationService.findAll(page, limit);
      }

      res.status(200).json(reservations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reservations" });
    }
  }

  private async getReservationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reservation = await this.reservationService.findByBookId(id);

      if (!reservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      res.status(200).json(reservation);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reservation" });
    }
  }

  private async getUserReservations(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit =
        parseInt(req.query.limit as string) || config.pagination.defaultLimit;

      const reservations = await this.reservationService.findByUserId(
        userId,
        page,
        limit
      );
      res.status(200).json(reservations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user reservations" });
    }
  }

  private async getBookReservations(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { bookId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit =
        parseInt(req.query.limit as string) || config.pagination.defaultLimit;

      const reservations = await this.reservationService.findByBookId(
        bookId,
        page,
        limit
      );
      res.status(200).json(reservations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching book reservations" });
    }
  }

  private async createReservation(req: Request, res: Response): Promise<void> {
    try {
      const reservationData = req.body as CreateReservationDTO;
      const reservation = await this.reservationService.createReservation(
        reservationData.userId,
        reservationData.bookId
      );
      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "Book not found" ||
          error.message === "User not found"
        ) {
          res.status(404).json({ message: error.message });
          return;
        }

        if (error.message === "Book is not available for reservation") {
          res.status(400).json({ message: error.message });
          return;
        }

        if (error.message === "User already has this book") {
          res.status(400).json({ message: error.message });
          return;
        }

        if (
          error.message ===
          "User has reached the maximum number of books allowed"
        ) {
          res.status(400).json({ message: error.message });
          return;
        }

        if (error.message === "Insufficient funds") {
          res.status(400).json({ message: error.message });
          return;
        }
      }

      res.status(500).json({ message: "Error creating reservation" });
    }
  }

  private async returnBook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reservation = await this.reservationService.returnBook(id);

      if (!reservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      res.status(200).json(reservation);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "Book has already been returned" ||
          error.message === "Book has already been purchased")
      ) {
        res.status(400).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: "Error returning book" });
    }
  }

  private async forceDueDate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { dueDate } = req.body as ForceDueDateDTO;

      const parsedNewDueDate = new Date(dueDate!);
      if (isNaN(parsedNewDueDate.getTime())) {
        res
          .status(400)
          .json({ message: "Invalid date format for parsedNewDueDate" });
        return;
      }

      const reservation = await this.reservationService.update(
        id,
        {dueDate: parsedNewDueDate}
      );

      if (!reservation) {
        res.status(404).json({ message: "Book not found" });
        return;
      }

      res.status(200).json(reservation);
    } catch (error) {
      console.error("Error in forceDueDate:", error); // Log the actual error
      res.status(500).json({ message: "An unexpected error occurred" });
    }
  }
}
