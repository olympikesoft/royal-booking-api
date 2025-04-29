#!/usr/bin/env node
// scripts/seed.ts

import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import mongoose, { Types } from 'mongoose';
import { Transform } from 'stream';
import { config } from '../src/config'; // Assuming config is in ../src
import { BookModel } from '../src/infrastructure/database/schemas/book.schema';
import { UserModel } from '../src/infrastructure/database/schemas/user.schema';
import { WalletModel } from '../src/infrastructure/database/schemas/wallet.schema';
import { ReservationModel } from '../src/infrastructure/database/schemas/reservation.schema';
import { UserRole } from '../src/domain/models/user';
import { ReservationStatus } from '../src/domain/models/reservation';
import { Book, BookProps } from '../src/domain/models/book'; // Assuming Book interface/type exists

// --- Configuration ---
const BATCH_SIZE = 1000; // Adjust based on memory/performance
const RESERVATION_FEE = 3;
const LATE_FEE_PER_DAY = 0.2;
const STANDARD_BORROW_DAYS = 7;
const CSV_FILE_PATH = path.join(__dirname, '..', 'data', 'challenge_books_sample.csv');

// --- Helper Functions ---
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Define a type for the lean user object needed for wallet/reservation seeding
type LeanUser = {
    _id: Types.ObjectId;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
};

type CsvRow = {
    csv_index: string; // Mapped from the empty first column header
    id: string;
    title: string;
    author?: string; // Keep optional as data might be missing
    publication_year?: string;
    publisher?: string;
    price?: string;
    genre?: string; // Add other expected headers from the actual file if needed
    description?: string;
    // Add any other potential headers from the CSV here
    [key: string]: any; // Allow other potential fields if the file has more columns
 };

// --- Database Operations ---
async function connectToDatabase() {
    try {
        console.log(`Connecting to MongoDB at ${config.database.uri}...`);
        await mongoose.connect(config.database.uri, {
            maxPoolSize: 15,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

async function clearCollections() {
    console.log('Clearing existing collections...');
    try {
        await ReservationModel.deleteMany({});
        console.log('Cleared reservations collection');
        await WalletModel.deleteMany({});
        console.log('Cleared wallets collection');
        await UserModel.deleteMany({});
        console.log('Cleared users collection');
        await BookModel.deleteMany({});
        console.log('Cleared books collection');
    } catch (error) {
        console.error('Error clearing collections:', error);
        throw error; // Propagate error to stop seeding if clearing fails
    }
}

// --- Book Seeding ---

/**
 * More robust transform stream for CSV book data.
 * Handles missing/invalid data gracefully.
 */
function createBookTransformer(skippedRecordLogger: (record: any, reason: string) => void) {
    return new Transform({
        objectMode: true,
        transform(chunk: CsvRow, encoding, callback) {
            try {
                 // Check for required fields based on the headers we defined
                 if (!chunk.id || !chunk.title) {
                    skippedRecordLogger(chunk, 'Missing required field (ID/ISBN or Title)');
                    return callback(); // Skip this record
                }
 
                // Data cleaning and transformation
                const authors = chunk.author
                    ? chunk.author.split(',').map((author: string) => author.trim()).filter((a: string) => a)
                    : [];
                const categories = chunk.genre
                    ? chunk.genre.split(',').map((genre: string) => genre.trim()).filter((g: string) => g)
                    : [];
 
                 let publicationYear = parseInt(chunk.publication_year ?? '0', 10);
                 if (isNaN(publicationYear) || publicationYear <= 0) {
                     skippedRecordLogger(chunk, `Invalid or missing publication year: ${chunk.publication_year}`);
                     publicationYear = 2020;
                 }
 
 
                let retailPrice = parseFloat(chunk.price ?? '10');
                if (isNaN(retailPrice) || retailPrice < 0) {
                    retailPrice = 10.0; // Default price
                }
 
                const totalCopies = Math.max(1, Math.floor(Math.random() * 3) + 1);
 
                // Create the object for the database, mapping CSV fields to BookProps
                const bookData: Omit<BookProps, 'id' | '_id'> = {
                    isbn: chunk.id, // Use the 'id' field from CSV as ISBN
                    title: chunk.title,
                    authors: authors.length > 0 ? authors : ['Unknown Author'],
                    publicationYear: publicationYear,
                    publisher: chunk.publisher || 'Unknown Publisher',
                    retailPrice: retailPrice,
                    totalCopies: totalCopies,
                    availableCopies: totalCopies,
                    categories: categories.length > 0 ? categories : ['Uncategorized'],
                    description: chunk.description || `${chunk.title} by ${authors.join(', ') || 'Unknown Author'}`,
                    createdAt: new Date(), // Add timestamps if your schema expects them
                    updatedAt:  new Date(),
                };
 
                callback(null, bookData);
            } catch (error: any) {
                console.error("Error transforming book data:", chunk, error);
                skippedRecordLogger(chunk, `Transformation error: ${error.message}`);
                callback(); // Skip problematic record but continue stream
            }
        }
    });
 }

/**
 * Inserts a batch of books using insertMany with unordered option.
 */
async function insertBookBatch(books: Omit<BookProps, 'id' | '_id'>[], batchNumber: number): Promise<number> {
    if (books.length === 0) {
        return 0;
    }
    try {
        const result = await BookModel.insertMany(books, { ordered: false });
        return result.length;
    } catch (error: any) {
        if (error.code === 11000 || error.name === 'BulkWriteError') {
            const successfulInserts = error.result?.nInserted || 0;
            const duplicateErrors = error.result?.getWriteErrors().filter((e: any) => e.code === 11000).length || 0;
            // Only log if there were duplicates to reduce console noise
            if (duplicateErrors > 0) {
                console.warn(`Batch ${batchNumber}: Inserted ${successfulInserts} books, skipped ${duplicateErrors} duplicates.`);
            }
            return successfulInserts;
        } else {
            console.error(`Failed to insert batch ${batchNumber}:`, error);
            throw error;
        }
    }
 }


async function seedBooks(): Promise<{ inserted: number, skipped: number }> {
    return new Promise<{ inserted: number, skipped: number }>((resolve, reject) => {
        console.log(`Reading books from ${CSV_FILE_PATH}...`);
 
        if (!fs.existsSync(CSV_FILE_PATH)) {
            const err = new Error(`CSV file not found: ${CSV_FILE_PATH}`);
            console.error(err.message);
            return reject(err);
        }
 
        let batch: Omit<BookProps, 'id' | '_id'>[] = [];
        let totalProcessed = 0;
        let totalInserted = 0;
        let totalSkipped = 0;
        let batchCount = 0;
        const logInterval = 500; // Log skipped records less frequently
 
        const skippedRecordLogger = (record: any, reason: string) => {
            totalSkipped++;
             if (totalSkipped % logInterval === 0 || totalSkipped === 1) {
               console.warn(`[WARN] Skipped record input line ${totalProcessed + 1}. Reason: ${reason}. Total skipped: ${totalSkipped}. Record sample: ${JSON.stringify(record).substring(0,150)}...`);
             }
        };
 
 
        const fileStream = createReadStream(CSV_FILE_PATH);
 
        const csvStream = csvParser({
            separator: ',', // Confirm comma separator
            skipComments: true, // Keep this
            headers: ['csv_index', 'id', 'title', 'author', 'publication_year', 'publisher', 'price', 'genre', 'description'],
            skipLines: 1 // *** IMPORTANT: NOW we skip the actual header line, as we defined headers manually ***
         });
 
        const bookTransformer = createBookTransformer(skippedRecordLogger);
 
        let streamPaused = false;
 
        fileStream.pipe(csvStream).pipe(bookTransformer)
            .on('data', async (bookData: Omit<BookProps, 'id' | '_id'>) => {
                totalProcessed++; // Increment when data reaches the transformer
                batch.push(bookData);
 
                // Batching, pause/resume logic remains the same...
                if (batch.length >= BATCH_SIZE) {
                     if (!streamPaused) {
                         if (!fileStream.isPaused()) fileStream.pause();
                         if (!csvStream.isPaused()) csvStream.pause();
                         if (!bookTransformer.isPaused()) bookTransformer.pause();
                         streamPaused = true;
                     }
                    const currentBatch = [...batch];
                    batch = [];
                    try {
                        const insertedInBatch = await insertBookBatch(currentBatch, ++batchCount);
                        totalInserted += insertedInBatch;
                         if (streamPaused) {
                             if (fileStream.isPaused()) fileStream.resume();
                             if (csvStream.isPaused()) csvStream.resume();
                             if (bookTransformer.isPaused()) bookTransformer.resume();
                             streamPaused = false;
                         }
                    } catch (error) {
                        console.error(`Critical error processing batch ${batchCount}. Stopping book seed.`, error);
                        fileStream.destroy();
                        reject(error);
                    }
                }
            })
            .on('end', async () => {
                console.log(`CSV stream ended. Total records processed (read from file): ${totalProcessed}.`); // Note: totalProcessed might be slightly different now depending on stream buffering, focus on inserted/skipped
                try {
                    // Insert the final batch
                    if (batch.length > 0) {
                        const insertedInFinalBatch = await insertBookBatch(batch, ++batchCount);
                        totalInserted += insertedInFinalBatch;
                    }
                     console.log(`Book seeding finished. Total valid books inserted: ${totalInserted}. Total records skipped: ${totalSkipped}.`);
                    resolve({ inserted: totalInserted, skipped: totalSkipped });
                } catch (error) {
                     console.error('Error inserting final book batch:', error);
                    reject(error);
                }
            })
            .on('error', (error: any) => {
                 // Handle stream errors
                 if (streamPaused) {
                     if (fileStream.isPaused()) fileStream.resume();
                     if (csvStream.isPaused()) csvStream.resume();
                     if (bookTransformer.isPaused()) bookTransformer.resume();
                 }
                 console.error('Error in CSV parsing or book processing stream:', error);
                 reject(error);
            });
 
        fileStream.on('error', (error: any) => { // Handle file read errors
            console.error(`Error reading CSV file ${CSV_FILE_PATH}:`, error);
            reject(error);
        });
    });
 }


// --- User and Wallet Seeding ---

async function seedUsers(): Promise<LeanUser[]> {
    console.log('Seeding sample users (upserting)...');

    // Add more realistic/varied data if needed
    const usersData = [
        { name: 'Admin User', email: 'admin@royallibrary.be', phoneNumber: '+32123456789', role: UserRole.ADMIN, isActive: true },
        { name: 'Librarian User', email: 'librarian@royallibrary.be', phoneNumber: '+32123456790', role: UserRole.LIBRARIAN, isActive: true },
        { name: 'John Doe', email: 'john.doe@example.com', phoneNumber: '+32123456791', role: UserRole.MEMBER, isActive: true },
        { name: 'Jane Smith', email: 'jane.smith@example.com', phoneNumber: '+32123456792', role: UserRole.MEMBER, isActive: true },
        { name: 'Alice Johnson', email: 'alice.j@sample.net', phoneNumber: '+32123456793', role: UserRole.MEMBER, isActive: true },
        { name: 'Bob Brown (Inactive)', email: 'bob.brown@inactive.org', phoneNumber: '+32123456794', role: UserRole.MEMBER, isActive: false },
        { name: 'Charlie Davis', email: 'charlie.d@sample.com', phoneNumber: '+32123456795', role: UserRole.MEMBER, isActive: true },
    ];

    try {
        const ops = usersData.map(user => ({
            updateOne: {
                filter: { email: user.email }, // Use email as the unique key for upsert
                update: { $setOnInsert: user }, // Only set fields if inserting
                upsert: true,
            },
        }));

        const bulkResult = await UserModel.bulkWrite(ops, { ordered: false });

        const upsertedCount = bulkResult.upsertedCount;
        const matchedCount = bulkResult.matchedCount; // How many existed already

        console.log(`User upsert results: ${upsertedCount} created, ${matchedCount} matched existing.`);

        // Fetch the users (including potentially existing ones) to get their IDs
        const seededUsers = await UserModel.find({ email: { $in: usersData.map(u => u.email) } }).lean();

        // Map to LeanUser type, ensuring _id is an ObjectId
        const typedUsers: LeanUser[] = seededUsers.map(user => ({
            _id: new Types.ObjectId(user.id!),
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        }));

        return typedUsers;
    } catch (error) {
        console.error('Error seeding users:', error);
        throw error; // Re-throw to stop the seed process
    }
}

async function seedWallets(users: LeanUser[]) {
    console.log('Seeding wallets for users (if they dont exist)...');

    if (!users || users.length === 0) {
        console.log('No users provided to seed wallets for.');
        return;
    }

    const userIds = users.map(user => user._id);

    try {
        // Find which users already have wallets
        const existingWallets = await WalletModel.find({ userId: { $in: userIds } }).select('userId -_id').lean();
        const usersWithWallets = new Set(existingWallets.map(w => w.userId.toString()));

        const walletsToCreate = users
            .filter(user => !usersWithWallets.has(user._id.toString())) // Filter out users who already have a wallet
            .map(user => ({
                userId: user._id, // Reference the user's ObjectId
                balance: user.role === UserRole.MEMBER ? 50.00 : (user.role === UserRole.LIBRARIAN ? 100.00 : 0.00), // Give members/librarians starting balance
                transactions: [], // Start with empty transactions
            }));

        if (walletsToCreate.length === 0) {
            console.log('All provided users already have wallets.');
            return;
        }

        console.log(`Creating ${walletsToCreate.length} new wallets...`);
        await WalletModel.insertMany(walletsToCreate, { ordered: false });
        console.log(`Successfully created ${walletsToCreate.length} wallets.`);

    } catch (error: any) {
         // Handle potential duplicate errors gracefully if run multiple times concurrently (though unlikely)
         if (error.code === 11000 || error.name === 'BulkWriteError') {
             const createdCount = error.result?.nInserted || 0;
             console.warn(`Wallet seeding: ${createdCount} wallets created, some might have existed or failed due to duplicates.`);
         } else {
            console.error('Error seeding wallets:', error);
            // Decide if this is critical enough to throw, maybe not?
         }
    }
}


// --- Reservation Seeding ---
// Helper type for lean book projection
type LeanBook = {
    _id: Types.ObjectId;
    isbn: string;
    title: string;
    availableCopies: number;
    retailPrice: number;
};

// --- Enhanced Reservation Seeding ---
async function seedReservations(users: LeanUser[]) {
    console.log('Seeding sample reservations for testing...');

    const memberUsers = users.filter(u => u.role === UserRole.MEMBER && u.isActive);

    if (memberUsers.length === 0) {
        console.log('No active members found to create sample reservations.');
        return;
    }

    // Get a sample of *available* books from the DB - get more books for more test cases
    const availableBooks = await BookModel.find({ availableCopies: { $gt: 0 } })
                                          .limit(memberUsers.length * 5) // Fetch more books for testing
                                          .select('_id isbn title availableCopies retailPrice') // Added retailPrice
                                          .lean<LeanBook[]>(); // Extended type to include retailPrice

    if (availableBooks.length === 0) {
        console.log('No available books found in DB to create sample reservations. (Did book seeding succeed?)');
        return;
    }

    console.log(`Found ${memberUsers.length} active members and ${availableBooks.length} available book samples for reservation seeding.`);

    const reservationsToCreate: any[] = []; 
    const bookUpdatesMap = new Map<string, { bookId: Types.ObjectId, change: number }>();
    const today = new Date();
    let bookIndex = 0;

    // --- Reservation 1: Active (standard case) ---
    const user1 = memberUsers[0];
    const book1 = getNextAvailableBook(0, availableBooks);
    if (user1 && book1) {
        const borrowDate1 = addDays(today, -5); // Borrowed 5 days ago
        const dueDate1 = addDays(borrowDate1, STANDARD_BORROW_DAYS);
        reservationsToCreate.push({
            userId: user1._id,
            bookId: book1._id,
            status: ReservationStatus.ACTIVE,
            borrowDate: borrowDate1,
            dueDate: dueDate1,
            fee: RESERVATION_FEE,
            lateFee: 0,
        });
        bookUpdatesMap.set(book1._id.toString(), { bookId: book1._id, change: -1 });
    }

    // --- Reservation 2: Returned (On Time) ---
    const user2 = memberUsers[1 % memberUsers.length];
    const book2 = getNextAvailableBook(1, availableBooks);
    if (user2 && book2) {
        const borrowDate2 = addDays(today, -10);
        const dueDate2 = addDays(borrowDate2, STANDARD_BORROW_DAYS);
        const returnDate2 = addDays(dueDate2, -1); // Returned 1 day before due date
        reservationsToCreate.push({
            userId: user2._id,
            bookId: book2._id,
            status: ReservationStatus.RETURNED,
            borrowDate: borrowDate2,
            dueDate: dueDate2,
            returnDate: returnDate2,
            fee: RESERVATION_FEE,
            lateFee: 0,
            reminderSent: true,
        });
        // No change needed for available copies as it's returned
    }

    // --- Reservation 3: Late (Still Active) ---
    const user3 = memberUsers[2 % memberUsers.length];
    const book3 = getNextAvailableBook(2, availableBooks);
    if (user3 && book3) {
        const borrowDate3 = addDays(today, -12);
        const dueDate3 = addDays(borrowDate3, STANDARD_BORROW_DAYS); // Due 5 days ago
        const daysLate3 = Math.max(0, Math.ceil((today.getTime() - dueDate3.getTime()) / (1000 * 60 * 60 * 24)));
        const currentLateFee3 = parseFloat((daysLate3 * LATE_FEE_PER_DAY).toFixed(2));

        reservationsToCreate.push({
            userId: user3._id,
            bookId: book3._id,
            status: ReservationStatus.LATE,
            borrowDate: borrowDate3,
            dueDate: dueDate3,
            fee: RESERVATION_FEE,
            lateFee: currentLateFee3,
            reminderSent: true,
            lateReminderSent: true,
        });
        const existingUpdate = bookUpdatesMap.get(book3._id.toString());
        bookUpdatesMap.set(book3._id.toString(), {
            bookId: book3._id,
            change: (existingUpdate ? existingUpdate.change : 0) - 1
        });
    }

    // --- Reservation 4: Returned (Late) ---
    const user4 = memberUsers[3 % memberUsers.length];
    const book4 = getNextAvailableBook(3, availableBooks);
    if (user4 && book4) {
        const borrowDate4 = addDays(today, -15);
        const dueDate4 = addDays(borrowDate4, STANDARD_BORROW_DAYS); // Due 8 days ago
        const returnDate4 = addDays(today, -2); // Returned 2 days ago (so 6 days late)
        const daysLate4 = Math.max(0, Math.ceil((returnDate4.getTime() - dueDate4.getTime()) / (1000 * 60 * 60 * 24)));
        const finalLateFee4 = parseFloat((daysLate4 * LATE_FEE_PER_DAY).toFixed(2));

        reservationsToCreate.push({
            userId: user4._id,
            bookId: book4._id,
            status: ReservationStatus.RETURNED,
            borrowDate: borrowDate4,
            dueDate: dueDate4,
            returnDate: returnDate4,
            fee: RESERVATION_FEE,
            lateFee: finalLateFee4,
            reminderSent: true,
            lateReminderSent: true,
        });
    }

    // --- Reservation 5: Due Very Soon (To test due reminder job) ---
    const user5 = memberUsers[0];  // Reuse user
    const book5 = getNextAvailableBook(4, availableBooks);
    if (user5 && book5) {
        const borrowDate5 = addDays(today, -5);
        const dueDate5 = addDays(today, 2); // Due in 2 days (perfect for testing due reminders)
        reservationsToCreate.push({
            userId: user5._id,
            bookId: book5._id,
            status: ReservationStatus.ACTIVE,
            borrowDate: borrowDate5,
            dueDate: dueDate5,
            fee: RESERVATION_FEE,
            lateFee: 0,
            reminderSent: false, // Important: NOT YET REMINDED
        });
        bookUpdatesMap.set(book5._id.toString(), { 
            bookId: book5._id, 
            change: bookUpdatesMap.get(book5._id.toString())?.change || 0 - 1 
        });
    }

    // --- Reservation 6: Very Late (Testing auto-purchase conversion) ---
    const user6 = memberUsers[1 % memberUsers.length];
    const book6 = getNextAvailableBook(5, availableBooks);
    if (user6 && book6) {
        const borrowDate6 = addDays(today, -60); // Borrowed 60 days ago
        const dueDate6 = addDays(borrowDate6, STANDARD_BORROW_DAYS);
        
        // Calculate a late fee that exceeds book price
        const daysLate6 = Math.max(0, Math.ceil((today.getTime() - dueDate6.getTime()) / (1000 * 60 * 60 * 24)));
        const lateFeeThatWouldExceedPrice = book6.retailPrice + 5; // Make sure it exceeds retail price
        
        reservationsToCreate.push({
            userId: user6._id,
            bookId: book6._id,
            status: ReservationStatus.LATE,
            borrowDate: borrowDate6,
            dueDate: dueDate6,
            fee: RESERVATION_FEE,
            // Use whichever is higher: calculated fee or one that exceeds price
            lateFee: Math.max(parseFloat((daysLate6 * LATE_FEE_PER_DAY).toFixed(2)), lateFeeThatWouldExceedPrice),
            reminderSent: true,
            lateReminderSent: true,
        });
        bookUpdatesMap.set(book6._id.toString(), { bookId: book6._id, change: -1 });
    }

    // --- Reservation 7: Pending (for more status coverage) ---
    const user7 = memberUsers[2 % memberUsers.length];
    const book7 = getNextAvailableBook(6, availableBooks);
    if (user7 && book7) {
        const requestDate = addDays(today, -1);
        reservationsToCreate.push({
            userId: user7._id,
            bookId: book7._id,
            status: ReservationStatus.PENDING,
            borrowDate: null, // Not borrowed yet
            dueDate: null, // Not determined yet
            fee: RESERVATION_FEE,
            lateFee: 0,
            createdAt: requestDate,
            updatedAt: requestDate
        });
        // No book update yet since reservation is pending
    }

    // --- Reservation 8: Just became late (To test late reminder job) ---
    const user8 = memberUsers[3 % memberUsers.length];
    const book8 = getNextAvailableBook(7, availableBooks);
    if (user8 && book8) {
        const borrowDate8 = addDays(today, -10);
        const dueDate8 = addDays(today, -3); // 3 days overdue (eligible for late reminder)
        reservationsToCreate.push({
            userId: user8._id,
            bookId: book8._id,
            status: ReservationStatus.ACTIVE, // Still marked as ACTIVE but overdue (system should update)
            borrowDate: borrowDate8,
            dueDate: dueDate8,
            fee: RESERVATION_FEE,
            lateFee: 0, // Not yet assessed late fee
            reminderSent: true, // Got the initial reminder
            lateReminderSent: false, // Not yet sent late reminder
        });
        bookUpdatesMap.set(book8._id.toString(), { bookId: book8._id, change: -1 });
    }

    // --- Insert Reservations and Update Books ---
    try {
        if (reservationsToCreate.length > 0) {
            console.log(`Attempting to insert ${reservationsToCreate.length} sample reservations...`);
            const createdReservations = await ReservationModel.insertMany(reservationsToCreate, { ordered: false });
            console.log(`Successfully inserted ${createdReservations.length} reservations.`);

            // Update book counts atomically
            const bookUpdates = Array.from(bookUpdatesMap.values());
            if (bookUpdates.length > 0) {
                console.log(`Updating available copies for ${bookUpdates.length} books...`);
                const bulkOps = bookUpdates.map(update => ({
                    updateOne: {
                        filter: { _id: update.bookId, availableCopies: { $gte: Math.abs(update.change) } },
                        update: { $inc: { availableCopies: update.change } }
                    }
                }));
                const updateResult = await BookModel.bulkWrite(bulkOps, { ordered: false });
                console.log(`Book counts update result: ${updateResult.modifiedCount} modified.`);
                if (updateResult.modifiedCount < bookUpdates.length) {
                    console.warn(`Could not decrement available copies for ${bookUpdates.length - updateResult.modifiedCount} books (potentially due to insufficient copies).`);
                }
            }
        } else {
            console.log('No reservation data generated to insert.');
        }
    } catch (error: any) {
        if (error.name === 'BulkWriteError') {
            const insertedCount = error.result?.nInserted || 0;
            console.warn(`Reservation/Book Update: ${insertedCount} successful operations, some may have failed (duplicates, concurrency?).`);
        } else {
            console.error('Error seeding reservations or updating book counts:', error);
        }
    }
}

  // Function to get the next available book, avoiding reuse if possible
  const getNextAvailableBook = (bookIndex: number, availableBooks: LeanBook[]): (LeanBook & { retailPrice: number }) | undefined => {
    if (bookIndex < availableBooks.length) {
        return availableBooks[bookIndex++];
    }
    console.warn("Ran out of unique available books for sample reservations.");
    return undefined;
};

// --- Main Execution ---
async function main() {
    let connectionClosed = false;
    console.time('Seed duration');

    try {
        await connectToDatabase();
        await clearCollections();

        // Seed Books first
        await seedBooks();

        // Seed Users (upsert)
        const users = await seedUsers();

        // Seed Wallets (only if needed)
        await seedWallets(users); // Pass users with _id and role

        // Seed Reservations using users and freshly fetched available books
        await seedReservations(users); // Fetches books internally now

        console.log('\nSeed completed successfully!');

    } catch (error) {
        console.error('\n--- Seeding failed ---');
        console.error(error); // Log the actual error object
        process.exitCode = 1; // Indicate failure
    } finally {
        console.timeEnd('Seed duration'); // Log duration regardless of success/failure
        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) { // Connected or Connecting
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed.');
                connectionClosed = true;
            } catch (closeError) {
                console.error('Error closing MongoDB connection:', closeError);
            }
        }
        if (!connectionClosed && mongoose.connection.readyState !== 0) { // Not closed and not disconnected
             console.log('MongoDB connection state:', mongoose.connection.readyState);
        }
        process.exit(process.exitCode || 0); // Exit with appropriate code
    }
}

// Execute the main function
main();