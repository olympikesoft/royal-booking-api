# Library Management System API

This project provides a backend API for managing a library system. It allows for managing book references, users, borrowing/reservations, user wallets, and automated reminders.

Built using Node.js, TypeScript, and potentially leveraging Domain-Driven Design (DDD) principles. The API runs within Docker containers.
This project don't have implemented Auth system and dont use SMTP implementation. 
Note: NODE_ENV=dev for test purposes.

## Features

*   **Reference Management:** Add, get, update, and delete book references.
*   **Catalog Search:** Search for book references by title, author, or publication year.
*   **Reservation & Borrowing:** Users can borrow available books (up to 3 concurrently, one copy per reference). Book availability is tracked (4 copies per reference assumed). Reservation history is maintained.
*   **Wallet System:** Each user has a wallet. Borrowing costs 3 euros. Late fees (0.2 euros/day) are applied and deducted. If fees reach the book's retail price, the user is considered to have bought it.
*   **Automated Reminders:** Email notifications for upcoming due dates and late returns (handled by a background scheduler).
*   **Data Seeding:** Initial book references can be seeded from a CSV file.

## Project Structure


library-management-system/
├── src/
│ ├── domain/ # Domain layer (Entities, Repos, Domain Services)
│ │ ├── models/
│ │ │ ├── book/
│ │ │ ├── user/
│ │ │ ├── reservation/
│ │ │ └── wallet/
│ │ ├── repositories/
│ │ └── services/
│ ├── application/ # Application layer (Use Cases, DTOs)
│ │ ├── services/
│ │ ├── dtos/
│ │ └── validators/
│ ├── infrastructure/ # Infrastructure layer (DB, Email, External Services)
│ │ ├── database/
│ │ ├── repositories/
│ │ ├── email/
│ │ └── scheduler/
│ ├── interfaces/ # Interface layer (API Controllers, CLI, etc.)
│ │ ├── http/
│ │ └── jobs/
│ ├── config/ # Configuration
│ └── utils/ # Utilities
├── tests/ # Automated tests
├── scripts/ # Seeding scripts, etc.
│ └── seed.ts
│ └── books_sample.csv # Sample book data
├── .env # Environment variables (ignored by git)
├── .env.example # Example environment variables
├── docker-compose.yml # Docker Compose configuration
├── Dockerfile # Dockerfile for the application
├── package.json
├── tsconfig.json
├── nodemon.json
└── README.md # This file

## Prerequisites

*   Docker: [https://www.docker.com/get-started](https://www.docker.com/get-started)
*   Docker Compose: Usually included with Docker Desktop.
*   A tool for making HTTP requests (like `curl`, Postman, or Insomnia).

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd library-management-system
    ```

2.  **Environment Configuration:**
    Copy the example environment file and customize it if necessary (e.g., database credentials, ports).
    ```bash
    cp .env.example .env
    ```
    *Ensure the `MONGO_URI`, `MONGO_USER`, `MONGO_PASS`, and `MONGO_DB_NAME` variables match your `docker-compose.yml` setup.*
    *The default API port is assumed to be `3000`. Adjust `curl` commands if you change `PORT` in `.env`.*

3.  **Build and Start Containers:**
    This command will build the Docker images (if they don't exist) and start the application API and MongoDB database containers in detached mode.

    ```bash
    docker-compose build --no-cache app
    ```

     ```bash
    docker-compose up -d
    ```

4.  **Check Container Logs (Optional):**
    To view the logs from the running application container:
    ```bash
    docker-compose logs -f app
    ```
    *(Replace `library-management-api` if your service name in `docker-compose.yml` is different)*

5.  **Seed Initial Data:**
    The system requires some initial data to function correctly (book references and potentially mock users).

    *   **Seed Book References:** This command executes the seeding script inside the running container, which reads from `scripts/books_sample.csv`.
        ```bash
        docker exec -it library-management-api npm run seed
        ```
    *   **Mock Users:** The application likely creates mock users if none exist or relies on user creation via the API.
     docker exec -it library-management-api /bin/sh
     run npm run seed
     Check the seeder script (`scripts/seed.ts`) or application startup logic for details. If users need to be created manually via API, use the `POST /api/v1/users` endpoint below.

6.  **Verify Database Content (Optional):**
    You can connect to the MongoDB container to check the collections.
    ```bash
    # Connect to the MongoDB container shell
    docker exec -it library-mongodb mongosh -u admin -p password --authenticationDatabase admin

    # Inside the mongosh shell:
    use royal-library; // Or your DB name from .env
    show collections;
    db.references.find().pretty();
    db.users.find().pretty();
    db.reservations.find().pretty();
    exit;
    ```

## API Endpoints & Testing with `curl`

The API base URL is assumed to be `http://localhost:3000/api/v1`.

**Note:** Replace placeholder values like `<BOOK_ID>`, `<USER_ID>`, `<RESERVATION_ID>` with actual IDs obtained from previous API calls (e.g., from `GET` responses or creation responses).

---

### 1. Book (Books Catalogue)

**a. Add a New Book Reference**

*   **Endpoint:** `POST /api/v1/books`
*   **Description:** Adds a new book reference to the catalog. Assumes 4 available copies are created internally.
*   **Body (Based on `CreateBookDTO`):**
    ```json
    {
      "isbn": "978-0345391803", // Example valid ISBN-13
      "title": "The Hitchhiker's Guide to the Galaxy",
      "authors": ["Douglas Adams"], // Array of strings, at least one
      "publicationYear": 1979,
      "publisher": "Pan Books",
      "retailPrice": 15.99, // Used for late fee calculation if book is "bought"
      "totalCopies": 4,     // Total physical copies
      "availableCopies": 4, // Initially available copies (must be <= totalCopies)
      "categories": ["Science Fiction", "Comedy"], // Array of strings
      "description": "Seconds before the Earth is demolished..." // Optional
    }
    ```
*   **`curl` Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/books \
         -H "Content-Type: application/json" \
         -d '{
              "isbn": "978-0345391803",
              "title": "The Hitchhiker'\''s Guide to the Galaxy",
              "authors": ["Douglas Adams"],
              "publicationYear": 1979,
              "publisher": "Pan Books",
              "retailPrice": 15.99,
              "totalCopies": 4,
              "availableCopies": 4,
              "categories": ["Science Fiction", "Comedy"],
              "description": "Seconds before the Earth is demolished..."
            }'
    ```

**b. Get All Book References (with Search)**

*   **Endpoint:** `GET /api/v1/books`
*   **Description:** Retrieves a list of all book references. Supports filtering by title, author, and publication year via query parameters. Includes availability count.
*   **Query Parameters (Optional):**
    *   `title=<string>`
    *   `author=<string>`
    *   `year=<number>`
*   **`curl` Examples:**
    *   Get all:
        ```bash
        curl http://localhost:3000/api/v1/books
        ```
    *   Search by author:
        ```bash
        curl "http://localhost:3000/api/v1/books?author=Douglas%20Adams"
        ```
    *   Search by year:
        ```bash
        curl "http://localhost:3000/api/v1/books?year=1979"
        ```
    *   Search by title:
        ```bash
        curl "http://localhost:3000/api/v1/books?title=Hitchhiker" # Partial match likely
        ```

**c. Get a Specific Book Reference**

*   **Endpoint:** `GET /api/v1/books/<BOOK_ID>`
*   **Description:** Retrieves details for a single book reference, including availability.
*   **`curl` Example:** (Replace `<BOOK_ID>` with an actual ID from the `GET /books` response)
    ```bash
    curl http://localhost:3000/api/v1/books/<BOOK_ID>
    ```

**d. Update a Book Reference**

*   **Endpoint:** `PUT /api/v1/books/<BOOK_ID>`
*   **Description:** Updates details of an existing book reference.
*   **Body:** (Include fields to update)
    ```json
    {
      "title": "Updated Title",
      "retailPrice": 16.50
    }
    ```
*   **`curl` Example:**
    ```bash
    curl -X PUT http://localhost:3000/api/v1/books/<BOOK_ID> \
         -H "Content-Type: application/json" \
         -d '{ "title": "Updated Title", "retailPrice": 16.50 }'
    ```

**e. Delete a Book Reference**

*   **Endpoint:** `DELETE /api/v1/books/<BOOK_ID>`
*   **Description:** Deletes a book reference. Consider implications if books are currently borrowed. (Implementation might prevent deletion if borrowed copies exist).
*   **`curl` Example:**
    ```bash
    curl -X DELETE http://localhost:3000/api/v1/books/<BOOK_ID>
    ```

---

### 2. Users

**a. Create a User**

*   **Endpoint:** `POST /api/v1/users`
*   **Description:** Creates a new user with an initial wallet balance (e.g., default to 0 or a predefined amount).
*   **Body:**
    ```json
    {
      "name": "Alice Wonderland",
      "email": "alice@example.com"
      // "initialBalance": 10.0 // Optional: Or handled by default
    }
    ```
*   **`curl` Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/users \
         -H "Content-Type: application/json" \
         -d '{ "name": "Alice Wonderland", "email": "alice@example.com" }'
    ```
    *(Note the user ID returned in the response, you'll need it for other actions)*

**b. Get All Users**

*   **Endpoint:** `GET /api/v1/users`
*   **Description:** Retrieves a list of all users.
*   **`curl` Example:**
    ```bash
    curl http://localhost:3000/api/v1/users
    ```

**c. Get User Details**

*   **Endpoint:** `GET /api/v1/users/<USER_ID>`
*   **Description:** Retrieves details for a specific user, including their wallet balance and potentially current borrowings.
*   **`curl` Example:** (Replace `<USER_ID>` with an actual ID)
    ```bash
    curl http://localhost:3000/api/v1/users/<USER_ID>
    ```

---

### 3. Reservations & Borrowing

**a. Borrow a Book (Create Reservation)**

*   **Endpoint:** `POST /api/v1/reservations`
*   **Description:** Allows a user to borrow an available book reference. Deducts 3 euros from the user's wallet. Fails if the user already has 3 books borrowed, has this reference borrowed, insufficient funds, or no copies are available.
*   **Body:**
    ```json
    {
      "userId": "<USER_ID>",
      "bookId": "<BOOK_ID>"
    }
    ```
*   **`curl` Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/reservations \
         -H "Content-Type: application/json" \
         -d '{ "userId": "6810e1282820d160e580e3e7>", "bookId": "6810e1269d298e01c88daee9" }'
    ```
    *(Note the reservation ID returned in the response)*

**b. Get User's Reservation History**

*   **Endpoint:** `GET /api/v1/users/<USER_ID>/reservations`
*   **Description:** Retrieves the reservation history (past and present borrowings) for a specific user.
*   **Query Parameters (Optional):**
    *   `status=active` (Only show currently borrowed books)
    *   `status=returned` (Only show returned books)
*   **`curl` Example:**
    ```bash
    # Get all reservations for the user
    curl http://localhost:3000/api/v1/users/<USER_ID>/reservations

    # Get only active reservations for the user
    curl "http://localhost:3000/api/v1/users/<USER_ID>/reservations?status=active"
    ```

**c. Return a Book**

*   **Endpoint:** `POST /api/v1/reservations/<RESERVATION_ID>/return`
*   **Description:** Marks a specific reservation (borrowed book) as returned. Calculates and applies late fees if applicable. Updates book availability.
*   **`curl` Example:** (Replace `<RESERVATION_ID>` with the ID of an *active* reservation)
    ```bash
    curl -X POST http://localhost:3000/api/v1/reservations/<RESERVATION_ID>/return
    ```

**d. Force dueDate for testing purposes**
*   **Endpoint:** `POST /api/v1/reservations/<RESERVATION_ID>/return`
*   **Description:** force return the reservation of book for specific date
*   **`curl` Example:** (Replace `<RESERVATION_ID>` with the ID of an *active* reservation)
    ```bash
    curl -X PUT http://localhost:3000/api/v1/reservations/6810f66c1babdcf9c8916ff4/force-due-date \
     -H "Content-Type: application/json" \
     -d '{ "dueDate": "2025-04-15T12:00:00.000Z" }'
    ```
---

### 4. Wallet

**b. Create Wallet (Optional/Testing)**

*   **Endpoint:** `POST /api/v1/wallets`
*   **Description:** Adds funds to a user's wallet (useful for testing borrowing/fees).
*   **Body:**
    ```json
    {
      "userId": "<USER_ID>",
      "amount": 20.00,
    }
    ```
*   **`curl` Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/wallets \
         -H "Content-Type: application/json" \
         -d '{ "amount": 20.00, "userId": "6810e1282820d160e580e3e7" }'
    ```

**b. Get User Wallet**

*   **Endpoint:** `GET /api/v1/wallets/user/<USER_ID>`
*   **Description:** Retrieves the current balance of a user's wallet. (This might be included in `GET /api/v1/wallets/user/<USER_ID>` already).
*   **`curl` Example:**
    ```bash
    curl http://localhost:3000/api/v1/wallets/user/<USER_ID>
    ```

**c. Add Funds to Wallet (Optional/Testing)**

*   **Endpoint:** `POST /api/v1/wallets/<WALLET_ID>/deposit`
*   **Description:** Adds funds to a user's wallet (useful for testing borrowing/fees).
*   **Body:**
    ```json
    {
      "amount": 20.00
    }
    ```
*   **`curl` Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/wallets/<WALLET_ID>/deposit \
         -H "Content-Type: application/json" \
         -d '{ "amount": 20.00 }'
    ```

---

## Reminders

Reminders (due date warnings, late return notices) are handled by background jobs/scheduler within the infrastructure layer. There are typically no direct API endpoints for users to trigger these. The system should automatically:

1.  Identify reservations due in 2 days.
2.  Identify reservations overdue by 7 days.
3.  Send emails via the configured email service (e.g., SMTP, SendGrid, Mailgun, or a mock service for development).

Check the scheduler implementation (`src/infrastructure/scheduler/`) and job definitions (`src/interfaces/jobs/`) for details on how this is configured and run.

## Late Fees & Book Purchase

*   Late fees (0.2€/day) are calculated and deducted from the user's wallet when a book is returned via `POST /api/v1/reservations/<RESERVATION_ID>/return`.
*   A background job might also periodically check for overdue books and apply fees daily, although applying fees upon return is simpler.
*   If accumulated late fees for a specific borrowing instance reach or exceed the `retailPrice` of the book reference, the reservation status changes (e.g., to `purchased`), the book copy is considered permanently gone, and the user's wallet is charged accordingly (up to the retail price). This logic happens either during the return process or via a background check.

## Assumptions

*   **Database:** MongoDB is used as the primary database.
*   **API Port:** The API runs on port `3000` by default.
*   **Authentication:** No complex authentication (like JWT or OAuth) is implemented in the examples. User identification relies on providing `userId` in the request path or body. A real-world application would require proper authentication/authorization.
*   **Book Availability:** Each book reference starts with exactly 4 available copies unless modified by borrowing/returning/deletion.
*   **Borrowing Cost:** Each borrowing action costs a flat 3 euros, deducted immediately.
*   **Late Fee:** A flat fee of 0.2 euros per day applies *after* the due date.
*   **Due Date:** A standard borrowing period is assumed (e.g., 14 days). This should be configurable or defined in the reservation logic.
*   **Email Service:** An email sending service/mechanism is configured in the infrastructure layer. For local development, this might be a mock service that logs emails to the console.
*   **Scheduler:** A task scheduler (like `node-cron` or BullMQ with workers) is implemented and running to handle reminders and potentially other background tasks (like daily fee checks).
*   **User Schema (Example):** Users collection likely contains fields like `_id`, `name`, `email`, `createdAt`, `updatedAt`, `walletBalance`.
*   **Reference Schema (Example):** References collection likely contains `_id`, `title`, `author`, `publicationYear`, `isbn`, `retailPrice`, `availableCopies`, `createdAt`, `updatedAt`.
*   **Reservation Schema (Example):** Reservations collection likely contains `_id`, `userId`, `bookId`, `borrowedDate`, `dueDate`, `returnedDate`, `status` (`active`, `returned`, `overdue`, `purchased`), `lateFeesPaid`, `createdAt`, `updatedAt`.
