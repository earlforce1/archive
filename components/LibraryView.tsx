
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Book, Font, Pivot } from '../types';
import BookTile from './BookTile';
import { AddIcon, BookIcon, FontIcon, TrashIcon, CheckIcon, ResetIcon, StarOutlineIcon } from './icons/Icons';
import { db } from '../services/database';
import { parseFile } from '../services/fileParser';
import ConfirmModal from './ConfirmModal';

interface LibraryViewProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onFilesAdded: () => void;
  onDeleteBook: (bookId: number) => void;
  onUpdateBookStatus: (bookId: number, status: 'started' | 'finished' | null) => void;
  initialSearchFocus: boolean;
  onSearchFocused: () => void;
  initialSearchQuery: string;
  onSearchInitialized: () => void;
}

const pivots: Pivot[] = ['authors', 'series'];

const formatAuthorForSort = (author: string): string => {
  if (author === 'Unknown Author') return author;
  const parts = author.trim().split(' ');
  if (parts.length > 1) {
    const lastName = parts.pop();
    return `${lastName}, ${parts.join(' ')}`;
  }
  return author;
};

const comprehensiveBookSort = (a: Book, b: Book): number => {
    // 1. Author's last name
    const authorA = formatAuthorForSort(a.author);
    const authorB = formatAuthorForSort(b.author);
    const authorCompare = authorA.localeCompare(authorB);
    if (authorCompare !== 0) return authorCompare;

    // Authors are the same. Now, group books with a series before those without.
    const aInSeries = !!a.series;
    const bInSeries = !!b.series;

    if (aInSeries && !bInSeries) return -1;
    if (!aInSeries && bInSeries) return 1;
    
    if (aInSeries && bInSeries) {
        // 2. Series name
        const seriesA = a.series || '';
        const seriesB = b.series || '';
        const seriesCompare = seriesA.localeCompare(seriesB);
        if (seriesCompare !== 0) return seriesCompare;

        // 3. Series number
        const numA = a.seriesNumber ?? Number.MAX_SAFE_INTEGER;
        const numB = b.seriesNumber ?? Number.MAX_SAFE_INTEGER;
        if (numA !== numB) return numA - numB;
    }

    // Fallback for non-series books by the same author,
    // or same series without numbers.
    return a.title.localeCompare(b.title);
};


const LibraryView: React.FC<LibraryViewProps> = ({ books, onOpenBook, onFilesAdded, onDeleteBook, onUpdateBookStatus, initialSearchFocus, onSearchFocused, initialSearchQuery, onSearchInitialized }) => {
  const [activePivot, setActivePivot] = useState<Pivot>('authors');
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    book: Book | null;
  }>({ visible: false, x: 0, y: 0, book: null });
  
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  useEffect(() => {
    if (initialSearchFocus) {
      searchInputRef.current?.focus();
      onSearchFocused();
    }
  }, [initialSearchFocus, onSearchFocused]);

  useEffect(() => {
    if (initialSearchQuery) {
        setSearchQuery(initialSearchQuery);
        onSearchInitialized();
    }
  }, [initialSearchQuery, onSearchInitialized]);

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, book: null });
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleContextMenu = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      book: book,
    });
  };

  const handleOpenConfirmModal = () => {
    if (!contextMenu.book) return;
    setBookToDelete(contextMenu.book);
    setIsConfirmModalOpen(true);
    setContextMenu({ visible: false, x: 0, y: 0, book: null });
  };

  const handleConfirmDeletion = () => {
    if (bookToDelete) {
        onDeleteBook(bookToDelete.id);
    }
    setIsConfirmModalOpen(false);
    setBookToDelete(null);
  };

  const handleStatusUpdate = (status: 'started' | 'finished' | null) => {
    if (contextMenu.book) {
      onUpdateBookStatus(contextMenu.book.id, status);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      const newBooks: Omit<Book, 'id'>[] = [];
      const newFonts: Omit<Font, 'id'>[] = [];

      for (const file of fileList) {
        const typedFile = file as File;
        if (typedFile.name.endsWith('.ttf') || typedFile.name.endsWith('.otf')) {
          const font = await parseFile(typedFile) as Omit<Font, 'id'>;
          newFonts.push(font);
        } else {
          const book = await parseFile(typedFile) as Omit<Book, 'id'>;
          newBooks.push(book);
        }
      }
      
      if (newBooks.length > 0) await db.addBooks(newBooks);
      if (newFonts.length > 0) await db.addFonts(newFonts);
      
      onFilesAdded();
    }
  };
  
  const searchedBooks = useMemo(() => {
    if (!searchQuery) return books;
    const lowercasedQuery = searchQuery.toLowerCase();
    return books.filter(book => 
      book.title.toLowerCase().includes(lowercasedQuery) ||
      book.author.toLowerCase().includes(lowercasedQuery)
    );
  }, [books, searchQuery]);

  const sortedAndFilteredBooks = useMemo(() => {
    let booksToSort = [...searchedBooks];

    if (activePivot === 'series') {
      booksToSort = booksToSort.filter(book => book.series);
    }
    
    return booksToSort.sort(comprehensiveBookSort);
  }, [searchedBooks, activePivot]);

  return (
    <div className="relative h-screen w-full pl-[80px] flex flex-col pt-8 overflow-y-auto">
      {isUploadMenuOpen && !contextMenu.visible && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setIsUploadMenuOpen(false)}
        />
      )}
      <div className="px-4">
        <h1 className="text-[42px] font-light lowercase text-gray-400 mb-4">library</h1>

        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">search</span>
          <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md py-2.5 pl-10 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        
        <div className="flex space-x-8 mb-8 border-b border-gray-800">
          {pivots.map(pivot => (
            <button
              key={pivot}
              onClick={() => setActivePivot(pivot)}
              className={`text-xl pb-2 -mb-px transition-colors ${
                activePivot === pivot 
                  ? 'text-white border-b-2 border-cyan-400 font-semibold' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {pivot}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-8 px-4 pb-24">
        {sortedAndFilteredBooks.length > 0 ? (
          sortedAndFilteredBooks.map(book => (
            <BookTile 
              key={book.id} 
              book={book} 
              onClick={onOpenBook} 
              onContextMenu={(e) => handleContextMenu(e, book)}
              size="medium" 
            />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500 mt-16">
            {searchQuery ? `No results found for "${searchQuery}".` : (activePivot === 'series' ? 'no books in a series.' : 'your library is empty.')}
          </p>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-20">
        {isUploadMenuOpen && (
          <div className="flex flex-col items-end gap-4 mb-4 animate-fade-in-up">
            <div className="flex items-center justify-end gap-3">
              <span className="bg-gray-900/80 backdrop-blur-sm text-sm text-gray-300 px-3 py-1 rounded-md shadow-lg">add book</span>
              <label htmlFor="book-upload" className="bg-gray-700 hover:bg-gray-600 text-white w-12 h-12 shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105 flex items-center justify-center">
                <BookIcon />
              </label>
              <input id="book-upload" type="file" multiple accept=".epub,.pdf" className="hidden" onChange={(e) => { handleFileChange(e); setIsUploadMenuOpen(false); }} />
            </div>
            <div className="flex items-center justify-end gap-3">
              <span className="bg-gray-900/80 backdrop-blur-sm text-sm text-gray-300 px-3 py-1 rounded-md shadow-lg">add font</span>
              <label htmlFor="font-upload" className="bg-gray-700 hover:bg-gray-600 text-white w-12 h-12 shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105 flex items-center justify-center">
                <FontIcon />
              </label>
              <input id="font-upload" type="file" multiple accept=".ttf,.otf" className="hidden" onChange={(e) => { handleFileChange(e); setIsUploadMenuOpen(false); }} />
            </div>
          </div>
        )}
        <button onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)} className="bg-cyan-500 hover:bg-cyan-400 text-black w-16 h-16 shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105 flex items-center justify-center float-right">
          <AddIcon />
        </button>
      </div>

      {contextMenu.visible && contextMenu.book && (
        <div
          className="fixed bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-md shadow-2xl p-1 z-50 animate-fade-in-up flex flex-col"
          style={{ animationDuration: '150ms', top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.book.status !== 'finished' && (
            <button onClick={() => handleStatusUpdate('finished')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white rounded flex items-center gap-2 transition-colors">
              <CheckIcon /> Mark as Finished
            </button>
          )}
          {contextMenu.book.status === 'finished' && (
             <button onClick={() => handleStatusUpdate('started')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white rounded flex items-center gap-2 transition-colors">
               <StarOutlineIcon /> Mark as Started
             </button>
          )}
          {contextMenu.book.status && (
            <button onClick={() => handleStatusUpdate(null)} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white rounded flex items-center gap-2 transition-colors">
              <ResetIcon /> Mark as Unread
            </button>
          )}
          <div className="h-px bg-gray-700 my-1"></div>
          <button onClick={handleOpenConfirmModal} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded flex items-center gap-2 transition-colors">
            <TrashIcon /> Remove Book
          </button>
        </div>
      )}

      <ConfirmModal isOpen={isConfirmModalOpen} onClose={() => { setIsConfirmModalOpen(false); setBookToDelete(null); }} onConfirm={handleConfirmDeletion} title={`Remove "${bookToDelete?.title}"?`} message="This action cannot be undone. The book file will be permanently deleted from your ARCHIVE." />
    </div>
  );
};

export default LibraryView;