# Library Management System API

This project provides a backend API for managing a library system. It allows for managing book references, users, borrowing/reservations, user wallets, and automated reminders.

Built using Node.js, TypeScript, and potentially leveraging Domain-Driven Design (DDD) principles. The API runs within Docker containers.

**Note:** This project does **not** have a dedicated authentication system implemented (user identification relies on passing IDs). It also uses a **mock or console-based email service** instead of a real SMTP implementation for reminders. `NODE_ENV=dev` is assumed for development/testing purposes.

## Features

- **Reference Management:** Add, get, update, and delete book references.
- **Catalog Search:** Search for book references by title, author, or publication year.
- **Reservation & Borrowing:** Users can borrow available books (up to 3 concurrently, one copy per reference). Book availability is tracked (4 copies per reference assumed by default). Reservation history is maintained.
- **Wallet System:** Each user has a wallet. Borrowing costs 3 euros. Late fees (0.2 euros/day) are applied and deducted upon return. If fees reach the book's retail price, the user is considered to have bought it.
- **Automated Reminders:** Notifications (logged or via mock email) for upcoming due dates and late returns, handled by a background scheduler.
- **Data Seeding:** Initial book references can be seeded from a CSV file.

## Project Structure (Illustrative DDD Layering)

library-management-system/
├── src/
│ ├── domain/ # Core Domain Logic (Independent of Infrastructure)
│ │ ├── models/ # Domain Entities/Aggregates
│ │ │ ├── book/
│ │ │ ├── user/
│ │ │ ├── reservation/
│ │ │ └── wallet/ # Wallet Entity
│ │ ├── repositories/ # Repository _Interfaces_ (Contracts)
│ │ └── services/ # Domain Services (Logic involving multiple entities)
│ ├── application/ # Application Layer (Orchestrates Use Cases)
│ │ ├── services/ # Application Services / Use Cases
│ │ ├── dtos/ # Data Transfer Objects
│ │ └── validators/ # Input Validation Logic
│ ├── infrastructure/ # Infrastructure Layer (Deals with external concerns)
│ │ ├── database/ # Database connection, schemas (if ORM/ODM specific)
│ │ ├── repositories/ # Concrete Repository _Implementations_ (e.g., MongoUserRepository)
│ │ ├── email/ # Email service implementation (e.g., MockEmailService)
│ │ └── scheduler/ # Background job scheduler implementation
│ ├── interfaces/ # Interface Layer (Entry points to the application)
│ │ ├── http/ # API Controllers, Routes, Middleware
│ │ └── jobs/ # Job definitions run by the scheduler
│ ├── config/ # Configuration files/logic
│ └── utils/ # Shared utilities
├── tests/ # Automated tests (Unit, Integration, E2E)
├── scripts/ # Utility scripts
│ ├── seed.ts # Data seeding script
│ └── books_sample.csv # Sample book data for seeding
├── .env # Environment variables (ignored by git)
├── .env.example # Example environment variables file
├── docker-compose.yml # Docker Compose configuration for services (app, db)
├── Dockerfile # Dockerfile for building the application image
├── package.json
├── tsconfig.json
├── nodemon.json # Nodemon configuration for development restarts
└── README.md # This file

## Prerequisites

- Docker: [https://www.docker.com/get-started](https://www.docker.com/get-started)
- Docker Compose: Usually included with Docker Desktop.
- A tool for making HTTP requests (like `curl`, Postman, or Insomnia).

## Getting Started

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd library-management-system
    ```

2.  **Environment Configuration:**
    Copy the example environment file and fill in your details.

    ```bash
    cp .env.example .env
    ```

    - Edit `.env`. Ensure the `MONGO_URI`, `MONGO_USER`, `MONGO_PASS`, and `MONGO_DB_NAME` variables align with your `docker-compose.yml` service definitions (especially the `mongo` service environment variables).
    - The default API port is `3000`. Adjust `PORT` in `.env` if needed, and update `curl` commands accordingly.

3.  **Build and Start Containers:**
    This command builds the Docker image for the app (if needed) and starts the application and MongoDB containers defined in `docker-compose.yml`.

    ```bash
    docker-compose up -d --build
    ```

    _(Using `--build` ensures the image is rebuilt if Dockerfile or source code changes. Add `--no-cache` to the `build` command specifically if you suspect caching issues: `docker-compose build --no-cache app`)_

4.  **Check Container Logs (Optional):**
    Tail the logs from the running application container to monitor startup and requests.

    ```bash
    docker-compose logs -f app
    ```

    _(Replace `app` if your service name in `docker-compose.yml` is different)_

5.  **Seed Initial Data:**
    Execute the seeding script inside the running application container. This populates the database with initial book references from `scripts/books_sample.csv`. It might also create initial mock users if designed to do so (check `scripts/seed.ts`).

    ```bash
    # Replace 'library-management-system-app-1' with the actual running container name/ID if needed
    # You can find the name using 'docker ps'
    # Or use the service name from docker-compose.yml:
    docker-compose exec app npm run seed
    ```

    - If the seeder doesn't create users, you'll need to create them manually using the `POST /api/v1/users` endpoint.

6.  **Verify Database Content (Optional):**
    Connect to the MongoDB container to inspect the data.

    ```bash
    # Connect using docker-compose exec (uses credentials from docker-compose.yml)
    docker-compose exec mongo mongosh -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase admin

    # Inside the mongosh shell:
    use royal-library; // Use the DB name specified in your .env (MONGO_DB_NAME)
    show collections;
    db.references.find().pretty(); // Check seeded books
    db.users.find().pretty();      // Check users
    db.wallets.find().pretty();    // Check wallets
    db.reservations.find().pretty(); // Check reservations
    exit;
    ```

## API Endpoints & Testing with `curl`

The API base URL is `http://localhost:3000/api/v1`.

**Note:** Replace placeholder values like `<BOOK_ID>`, `<USER_ID>`, `<RESERVATION_ID>`, `<WALLET_ID>` with actual IDs obtained from previous API call responses.

---

### 1. Book References (Catalogue)

**a. Add a New Book Reference**

- **Endpoint:** `POST /api/v1/books`
- **Description:** Adds a new book reference. `availableCopies` should usually equal `totalCopies` initially.
- **Body (`CreateBookDTO`):**
  ```json
  {
    "isbn": "978-1400079179",
    "title": "1984",
    "authors": ["George Orwell"],
    "publicationYear": 1949,
    "publisher": "Signet Classic",
    "retailPrice": 9.99,
    "totalCopies": 4,
    "availableCopies": 4,
    "categories": ["Dystopian", "Political Fiction", "Social Science Fiction"],
    "description": "A startlingly original and haunting novel..."
  }
  ```
- **`curl` Example:**
  ```bash
  curl -X POST http://localhost:3000/api/v1/books \
       -H "Content-Type: application/json" \
       -d '{
            "isbn": "978-1400079179",
            "title": "1984",
            "authors": ["George Orwell"],
            "publicationYear": 1949,
            "publisher": "Signet Classic",
            "retailPrice": 9.99,
            "totalCopies": 4,
            "availableCopies": 4,
            "categories": ["Dystopian", "Political Fiction"],
            "description": "A haunting novel..."
          }'
  ```

**b. Get All Book References (with Search)**

- **Endpoint:** `GET /api/v1/books`
- **Description:** Retrieves book references, optionally filtered. Includes availability count.
- **Query Parameters (Optional):** `title`, `author`, `year`
- **`curl` Examples:**
  ```bash
  # Get all
  curl http://localhost:3000/api/v1/books
  # Search by author
  curl "http://localhost:3000/api/v1/books?author=Orwell"
  # Search by year
  curl "http://localhost:3000/api/v1/books?year=1949"
  # Search by title (partial match likely supported)
  curl "http://localhost:3000/api/v1/books?title=1984"
  ```

**c. Get a Specific Book Reference**

- **Endpoint:** `GET /api/v1/books/<BOOK_ID>`
- **Description:** Retrieves details for a single book reference.
- **`curl` Example:**
  ```bash
  curl http://localhost:3000/api/v1/books/<BOOK_ID>
  ```

**d. Update a Book Reference**

- **Endpoint:** `PUT /api/v1/books/<BOOK_ID>`
- **Description:** Updates details of an existing book reference.
- **Body:** (Include fields to update)
  ```json
  {
    "title": "Nineteen Eighty-Four",
    "retailPrice": 10.5
  }
  ```
- **`curl` Example:**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/books/<BOOK_ID> \
       -H "Content-Type: application/json" \
       -d '{ "title": "Nineteen Eighty-Four", "retailPrice": 10.50 }'
  ```

**e. Delete a Book Reference**

- **Endpoint:** `DELETE /api/v1/books/<BOOK_ID>`
- **Description:** Deletes a book reference. Fails if copies are currently borrowed.
- **`curl` Example:**
  ```bash
  curl -X DELETE http://localhost:3000/api/v1/books/<BOOK_ID>
  ```

---

### 2. Users

**a. Create a User**

- **Endpoint:** `POST /api/v1/users`
- **Description:** Creates a new user. A corresponding wallet is typically created automatically with a default balance (e.g., 0 or a configured starting amount).
- **Body:**
  ```json
  {
    "name": "Bob The Builder",
    "email": "bob@example.com"
  }
  ```
- **`curl` Example:**
  ```bash
  curl -X POST http://localhost:3000/api/v1/users \
       -H "Content-Type: application/json" \
       -d '{ "name": "Bob The Builder", "email": "bob@example.com" }'
  ```
  _(Save the returned `_id` for `<USER_ID>`)_

**b. Get All Users**

- **Endpoint:** `GET /api/v1/users`
- **Description:** Retrieves a list of all users.
- **`curl` Example:**
  ```bash
  curl http://localhost:3000/api/v1/users
  ```

**c. Get User Details**

- **Endpoint:** `GET /api/v1/users/<USER_ID>`
- **Description:** Retrieves user details, often including wallet balance and possibly a summary of active borrowings.
- **`curl` Example:**
  ```bash
  curl http://localhost:3000/api/v1/users/<USER_ID>
  ```

---

### 3. Reservations & Borrowing

**a. Borrow a Book (Create Reservation)**

- **Endpoint:** `POST /api/v1/reservations`
- **Description:** A user borrows an available book. Deducts 3 euros. Fails if: user has >= 3 books, user already has this book, book unavailable, or insufficient funds.
- **Body:**
  ```json
  {
    "userId": "<USER_ID>",
    "bookId": "<BOOK_ID>"
  }
  ```
- **`curl` Example:**
  ```bash
  curl -X POST http://localhost:3000/api/v1/reservations \
       -H "Content-Type: application/json" \
       -d '{ "userId": "<USER_ID>", "bookId": "<BOOK_ID>" }'
  ```
  _(Save the returned `_id` for `<RESERVATION_ID>`)_

**b. Get User's Reservation History**

- **Endpoint:** `GET /api/v1/users/<USER_ID>/reservations`
- **Description:** Retrieves reservations for a user.
- **Query Parameters (Optional):**
  - `status=active` (Currently borrowed)
  - `status=returned`
  - `status=overdue`
  - `status=purchased`
- **`curl` Example:**
  ```bash
  # Get all for user
  curl http://localhost:3000/api/v1/users/<USER_ID>/reservations
  # Get active for user
  curl "http://localhost:3000/api/v1/users/<USER_ID>/reservations?status=active"
  ```

**c. Return a Book**

- **Endpoint:** `POST /api/v1/reservations/<RESERVATION_ID>/return`
- **Description:** Marks a borrowed book as returned. Calculates/applies late fees, updates book availability, and potentially marks as 'purchased' if fees exceed retail price.
- **`curl` Example:**
  ```bash
  curl -X POST http://localhost:3000/api/v1/reservations/<RESERVATION_ID>/return
  ```

**d. Force Due Date (for Testing)**

- **Endpoint:** `PUT /api/v1/reservations/<RESERVATION_ID>/force-due-date`
- **Description:** Updates the `dueDate` of an active reservation for testing late fee calculations.
- **Body:**
  ```json
  {
    "dueDate": "2023-01-15T12:00:00.000Z" // A date in the past
  }
  ```
- **`curl` Example:**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/reservations/<RESERVATION_ID>/force-due-date \
   -H "Content-Type: application/json" \
   -d '{ "dueDate": "2023-01-15T12:00:00.000Z" }'
  ```

---

### 4. Wallet

**a. Get User Wallet**

- **Endpoint:** `GET /api/v1/wallets/user/<USER_ID>`
- **Description:** Retrieves the current balance and details of a user's wallet.
- **`curl` Example:**
  ```bash
  curl http://localhost:3000/api/v1/wallets/user/<USER_ID>
  ```
  _(You might also get wallet info from `GET /api/v1/users/<USER_ID>`)_

**b. Add Funds to Wallet (Testing/Admin)**

- **Endpoint:** `POST /api/v1/wallets/<WALLET_ID>/deposit`
  _(Note: You'll need the `<WALLET_ID>` from the `GET /api/v1/wallets/user/<USER_ID>` or `GET /api/v1/users/<USER_ID>` response)_
- **Description:** Adds funds to a specific wallet. Useful for testing scenarios requiring funds.
- **Body:**
  ```json
  {
    "amount": 25.5
  }
  ```
- **`curl` Example:**
  ```bash
  curl -X POST http://localhost:3000/api/v1/wallets/<WALLET_ID>/deposit \
       -H "Content-Type: application/json" \
       -d '{ "amount": 25.50 }'
  ```

---

## Reminders

- Reminders (due soon, overdue) are intended to be triggered automatically by a background scheduler (e.g., running every day).
- These jobs check reservation due dates and send notifications (logged to console or via a mock email service in this setup).
- There are no direct API endpoints for users to trigger these reminders.
- Refer to `src/infrastructure/scheduler/` and `src/interfaces/jobs/` for implementation details.

## Late Fees & Book Purchase Logic

- **Fee Calculation:** Late fees (0.2€/day) are calculated when a book is returned (`POST /reservations/:id/return`). The fee is based on `currentDate - dueDate`.
- **Deduction:** Calculated fees are deducted from the user's wallet balance during the return process.
- **Purchase Condition:** If `accumulated_late_fees >= book.retailPrice` at the time of return (or potentially via a background check), the reservation status is updated to `purchased`, the fee deducted is capped at the `retailPrice`, and the `availableCopies` count for the book reference is permanently decreased. The book is _not_ physically returned to circulation in this case.

## Assumptions

- **Database:** MongoDB is the backing data store.
- **API Port:** API runs on port `3000` unless overridden by `PORT` env var.
- **Authentication:** No user authentication/authorization is implemented. `userId` is passed directly in requests.
- **Book Availability:** Each book reference is assumed to start with 4 available copies unless specified otherwise during creation or changed by borrowing/returns/purchases.
- **Borrowing Limit:** Users can borrow a maximum of 3 books concurrently.
- **Borrowing Cost:** Borrowing a book costs a flat 3 euros, deducted immediately from the user's wallet.
- **Late Fee:** 0.2 euros per day _after_ the due date.
- **Due Date:** A standard borrowing period (e.g., 14 days from borrowing) is assumed. This is set when a reservation is created.
- **Email Service:** A mock email service (e.g., logging to console) is used instead of a real SMTP service.
- **Scheduler:** A background task scheduler (like `node-cron`, BullMQ, etc.) is implemented and running for automated tasks like reminders.
- **Schema Examples (MongoDB):**
  - **Users:** `{ _id: ObjectId, name: String, email: String, createdAt: Date, updatedAt: Date }` (Wallet balance might be here or fetched from Wallet collection).
  - **Wallets:** `{ _id: ObjectId, userId: ObjectId, balance: Number, createdAt: Date, updatedAt: Date }`
  - **References (Books):** `{ _id: ObjectId, isbn: String, title: String, authors: [String], publicationYear: Number, publisher: String, retailPrice: Number, totalCopies: Number, availableCopies: Number, categories: [String], description: String, createdAt: Date, updatedAt: Date }`
  - **Reservations:** `{ _id: ObjectId, userId: ObjectId, bookId: ObjectId, borrowedDate: Date, dueDate: Date, returnedDate: Date | null, status: String ('active', 'returned', 'overdue', 'purchased'), lateFeesPaid: Number, createdAt: Date, updatedAt: Date }`
