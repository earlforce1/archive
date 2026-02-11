import { openDB, IDBPDatabase } from 'idb';
import { Book, Font } from '../types';
import { DB_NAME, DB_VERSION, BOOKS_STORE, FONTS_STORE } from '../constants';

class Database {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(BOOKS_STORE)) {
          db.createObjectStore(BOOKS_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(FONTS_STORE)) {
          db.createObjectStore(FONTS_STORE, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }

  async addBooks(books: Omit<Book, 'id'>[]) {
    const db = await this.dbPromise;
    const tx = db.transaction(BOOKS_STORE, 'readwrite');
    await Promise.all(books.map(book => tx.store.add(book)));
    await tx.done;
  }

  async getAllBooks(): Promise<Book[]> {
    const db = await this.dbPromise;
    return await db.getAll(BOOKS_STORE);
  }

  async deleteBook(id: number) {
    const db = await this.dbPromise;
    const tx = db.transaction(BOOKS_STORE, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
  }

  async updateBookLocation(bookId: number, location: string) {
    const db = await this.dbPromise;
    const tx = db.transaction(BOOKS_STORE, 'readwrite');
    const store = tx.store;
    const book = await store.get(bookId);
    if (book) {
      book.lastKnownLocation = location;
      await store.put(book);
    }
    await tx.done;
  }

  async updateBookSettings(bookId: number, settings: { fontSize?: number; fontFamily?: string; margin?: number; lineHeight?: number; }) {
    const db = await this.dbPromise;
    const tx = db.transaction(BOOKS_STORE, 'readwrite');
    const store = tx.store;
    const book = await store.get(bookId);
    if (book) {
      Object.assign(book, settings);
      await store.put(book);
    }
    await tx.done;
  }

  async updateBookStatus(bookId: number, status: 'started' | 'finished' | null) {
    const db = await this.dbPromise;
    const tx = db.transaction(BOOKS_STORE, 'readwrite');
    const store = tx.store;
    const book = await store.get(bookId);
    if (book) {
      if (status) {
        book.status = status;
      } else {
        // In case we want to mark as unread, we remove the property
        delete book.status;
      }
      await store.put(book);
    }
    await tx.done;
  }

  async addFonts(fonts: Omit<Font, 'id'>[]) {
    const db = await this.dbPromise;
    const tx = db.transaction(FONTS_STORE, 'readwrite');
    await Promise.all(fonts.map(font => tx.store.add(font)));
    await tx.done;
  }
  
  async getAllFonts(): Promise<Font[]> {
    const db = await this.dbPromise;
    return await db.getAll(FONTS_STORE);
  }
}

export const db = new Database();