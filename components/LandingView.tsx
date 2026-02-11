import React, { useState, useRef, useMemo } from 'react';
import { Book } from '../types';

interface LandingViewProps {
  onNavigateToLibrary: () => void;
  onNavigateToCurrentlyReading: () => void;
  onNavigateToSearch: (query: string) => void;
  currentlyReadingBook: Book | null;
  libraryBooks: Book[];
}

const LandingView: React.FC<LandingViewProps> = ({ 
  onNavigateToLibrary, 
  onNavigateToCurrentlyReading,
  onNavigateToSearch,
  currentlyReadingBook,
  libraryBooks
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateToSearch(searchQuery);
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="max-w-xl w-full">
        <div className="grid grid-cols-2 gap-4 auto-rows-[200px]">

          <div className="col-span-1 row-span-2 bg-tile-accent text-white p-6 flex flex-col justify-end shadow-lg">
            <h2 className="text-5xl font-light lowercase mb-1">archive</h2>
            <p className="text-sm opacity-80 leading-tight lowercase">all your books, archived.</p>
          </div>

          <button 
            onClick={onNavigateToLibrary}
            className="col-span-1 metro-tile bg-tile-secondary hover:opacity-90 text-white p-5 flex flex-col justify-between shadow-lg text-left"
          >
            <div className="flex justify-end">
              <span className="material-symbols-outlined text-3xl opacity-80">shelves</span>
            </div>
            <h3 className="text-xl font-light lowercase">library</h3>
          </button>

          <button 
            onClick={onNavigateToCurrentlyReading}
            disabled={!currentlyReadingBook}
            className="group col-span-1 metro-tile bg-neutral-800 text-white p-5 flex flex-col justify-between overflow-hidden relative shadow-lg text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Background Layer: Cover image or typographic color */}
            {currentlyReadingBook && (
              currentlyReadingBook.coverImage ? (
                <img src={currentlyReadingBook.coverImage} alt={`Cover of ${currentlyReadingBook.title}`} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: currentlyReadingBook.color }}></div>
              )
            )}
            
            {/* Scrim for Readability */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors pointer-events-none"></div>

            <div className="flex justify-end relative z-10">
              <span className="material-symbols-outlined text-3xl opacity-80">import_contacts</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-light lowercase">reading</h3>
            </div>
          </button>

          <form
            onSubmit={handleSearchSubmit}
            onClick={() => searchInputRef.current?.focus()}
            className="col-span-2 metro-tile bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between shadow-lg h-[100px] mt-2 text-left cursor-text"
          >
            <div className="flex items-center gap-4 flex-grow">
              <div className="w-12 h-12 bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">search</span>
              </div>
              <div className="flex-grow">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search archive"
                  className="w-full bg-transparent p-0 border-0 focus:ring-0 text-sm font-medium lowercase text-white placeholder:text-white focus:outline-none"
                  aria-label="Search Archive"
                />
                <p className="text-xs text-zinc-500 lowercase">find your next story</p>
              </div>
            </div>
            <button type="submit" className="p-2 -mr-2" aria-label="Perform Search">
              <span className="material-symbols-outlined text-zinc-600 text-xl">chevron_right</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default LandingView;