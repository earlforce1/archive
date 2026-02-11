import React, { useState, useEffect, useCallback } from 'react';
import { Book, Font, View } from './types';
import { db } from './services/database';
import LandingView from './components/LandingView';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import { BackIcon } from './components/icons/Icons';

const LAST_READ_BOOK_ID_KEY = 'archive_last_read_book_id';

const App: React.FC = () => {
  const [view, setView] = useState<View>('landing');
  const [books, setBooks] = useState<Book[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [lastReadBook, setLastReadBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialSearchFocus, setInitialSearchFocus] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [dbBooks, dbFonts] = await Promise.all([db.getAllBooks(), db.getAllFonts()]);
    setBooks(dbBooks);
    setFonts(dbFonts);

    const lastReadBookId = localStorage.getItem(LAST_READ_BOOK_ID_KEY);
    if (lastReadBookId) {
      const foundBook = dbBooks.find(b => b.id === parseInt(lastReadBookId, 10));
      if (foundBook) {
        setLastReadBook(foundBook);
      } else {
        setLastReadBook(null);
        localStorage.removeItem(LAST_READ_BOOK_ID_KEY);
      }
    } else {
        setLastReadBook(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openBook = async (book: Book) => {
    setCurrentBook(book);
    setLastReadBook(book);
    localStorage.setItem(LAST_READ_BOOK_ID_KEY, book.id.toString());
    
    // Set status to 'started' if it's new
    if (!book.status) {
      await db.updateBookStatus(book.id, 'started');
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: 'started' } : b));
    }

    setView('reader');
  };
  
  const navigateToLibrary = (search: { query?: string, focus?: boolean } = {}) => {
    setView('library');
    setInitialSearchQuery(search.query || '');
    setInitialSearchFocus(search.focus || false);
  };


  const goBack = () => {
    if (view === 'reader') {
      setView('library');
      setCurrentBook(null);
      const updatedLastReadBook = books.find(b => b.id === lastReadBook?.id);
      if (updatedLastReadBook) {
        setLastReadBook(updatedLastReadBook);
      }
    } else if (view === 'library') {
      setView('landing');
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    await db.deleteBook(bookId);
    setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
    if (lastReadBook?.id === bookId) {
      setLastReadBook(null);
      localStorage.removeItem(LAST_READ_BOOK_ID_KEY);
    }
  };

  const handleLocationUpdate = async (bookId: number, location: string) => {
    await db.updateBookLocation(bookId, location);
    setBooks(prevBooks => 
      prevBooks.map(b => 
        b.id === bookId ? { ...b, lastKnownLocation: location } : b
      )
    );
  };

  const handleSettingsUpdate = async (bookId: number, settings: { fontSize: number; fontFamily: string; margin: number; lineHeight: number; }) => {
    await db.updateBookSettings(bookId, settings);
    const updateState = (prev: Book[]) => prev.map(b => b.id === bookId ? { ...b, ...settings } : b);
    setBooks(updateState);
    if (currentBook?.id === bookId) {
        setCurrentBook(prev => prev ? { ...prev, ...settings } : null);
    }
  };

  const handleUpdateBookStatus = async (bookId: number, status: 'started' | 'finished' | null) => {
    await db.updateBookStatus(bookId, status);
    setBooks(prevBooks =>
      prevBooks.map(b =>
        b.id === bookId ? { ...b, status: status || undefined } : b
      )
    );
  };


  const renderView = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-screen w-screen"><p className="text-2xl text-gray-400">loading archive...</p></div>;
    }

    switch (view) {
      case 'landing':
        return <LandingView 
                  onNavigateToLibrary={() => navigateToLibrary()}
                  onNavigateToSearch={(query) => navigateToLibrary({ query, focus: !query })}
                  onNavigateToCurrentlyReading={() => lastReadBook && openBook(lastReadBook)}
                  currentlyReadingBook={lastReadBook}
                  libraryBooks={books}
               />;
      case 'library':
        return <LibraryView 
                  books={books} 
                  onOpenBook={openBook} 
                  onFilesAdded={loadData}
                  onDeleteBook={handleDeleteBook}
                  onUpdateBookStatus={handleUpdateBookStatus}
                  initialSearchQuery={initialSearchQuery}
                  onSearchInitialized={() => setInitialSearchQuery('')}
                  initialSearchFocus={initialSearchFocus}
                  onSearchFocused={() => setInitialSearchFocus(false)}
                />;
      case 'reader':
        return currentBook && <ReaderView 
                                book={currentBook} 
                                customFonts={fonts}
                                onLocationUpdate={handleLocationUpdate} 
                                onSettingsUpdate={handleSettingsUpdate}
                              />;
      default:
        return <LandingView 
                  onNavigateToLibrary={() => navigateToLibrary()}
                  onNavigateToSearch={(query) => navigateToLibrary({ query, focus: !query })}
                  onNavigateToCurrentlyReading={() => lastReadBook && openBook(lastReadBook)}
                  currentlyReadingBook={lastReadBook}
                  libraryBooks={books}
                />;
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      {view !== 'landing' && (
        <header className="fixed top-0 left-0 h-screen w-[80px] flex flex-col items-center pt-6 z-20">
            <button 
              onClick={goBack} 
              className="text-gray-400 hover:text-white transition-colors bg-neutral-900 hover:bg-neutral-800 w-14 h-14 flex items-center justify-center"
              aria-label="Go back"
            >
              <BackIcon />
            </button>
        </header>
      )}
      
      <main className="flex-grow overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;