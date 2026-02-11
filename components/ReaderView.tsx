import React, { useState, useEffect, useRef } from 'react';
import { Book, Font } from '../types';
import { SettingsIcon, AboutIcon, BookmarkIcon } from './icons/Icons';
import AboutPanel from './AboutPanel';
import EpubReader, { EpubReaderRef } from './EpubReader';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface ReaderViewProps {
  book: Book;
  customFonts: Font[];
  onLocationUpdate: (bookId: number, location: string) => void;
  onSettingsUpdate: (bookId: number, settings: { fontSize: number, fontFamily: string, margin: number, lineHeight: number }) => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ book, customFonts, onLocationUpdate, onSettingsUpdate }) => {
  const [fontSize, setFontSize] = useState(book.fontSize || 18);
  const [fontFamily, setFontFamily] = useState(book.fontFamily || 'Default');
  const [margin, setMargin] = useState(book.margin ?? 32);
  const [lineHeight, setLineHeight] = useState(book.lineHeight || 1.6);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutPanelOpen, setIsAboutPanelOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showBookmark, setShowBookmark] = useState(false);

  // PDF State
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const epubReaderRef = useRef<EpubReaderRef>(null);
  const locationUpdateTimeout = useRef<number | null>(null);

  // This ref holds the latest settings to be accessed on unmount.
  const latestSettings = useRef({ fontSize, fontFamily, margin, lineHeight });

  // On every render, update the ref with the latest state values.
  useEffect(() => {
    latestSettings.current = { fontSize, fontFamily, margin, lineHeight };
  });

  // Save the latest settings when the component unmounts (i.e., user leaves the reader).
  useEffect(() => {
    // The returned function is the cleanup function that runs on unmount.
    return () => {
      onSettingsUpdate(book.id, latestSettings.current);
    };
  }, [book.id, onSettingsUpdate]); // Dependencies are stable, so this effect sets up the unmount logic once.


  useEffect(() => {
    if (book.lastKnownLocation) {
      if (book.fileType === 'pdf') {
        const savedPage = parseInt(book.lastKnownLocation, 10);
        if (!isNaN(savedPage)) setPageNumber(savedPage);
      }
      setShowBookmark(true);
      const timer = setTimeout(() => setShowBookmark(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [book.id, book.lastKnownLocation, book.fileType]);

  useEffect(() => {
    if (book.file) {
      const url = URL.createObjectURL(book.file);
      setFileUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setFileUrl(null);
      };
    }
  }, [book]);

  const handleLocationChange = (location: string) => {
    if (locationUpdateTimeout.current) clearTimeout(locationUpdateTimeout.current);
    locationUpdateTimeout.current = window.setTimeout(() => onLocationUpdate(book.id, location), 1000);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleNextPage = () => {
    if (book.fileType === 'epub') {
      epubReaderRef.current?.nextPage();
    } else if (book.fileType === 'pdf') {
      setPageNumber(prev => {
        const next = Math.min(prev + 1, numPages || prev);
        handleLocationChange(next.toString());
        return next;
      });
    }
  };

  const handlePrevPage = () => {
    if (book.fileType === 'epub') {
      epubReaderRef.current?.prevPage();
    } else if (book.fileType === 'pdf') {
      setPageNumber(prev => {
        const next = Math.max(prev - 1, 1);
        handleLocationChange(next.toString());
        return next;
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (book.fileType === 'epub' || book.fileType === 'pdf') {
        if (event.key === 'ArrowRight') handleNextPage();
        else if (event.key === 'ArrowLeft') handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book.fileType, numPages]); // Add numPages dependency for PDF

  const renderContent = () => {
    if (book.fileType === 'pdf' && fileUrl) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-start overflow-auto p-4 relative bg-neutral-900">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="shadow-xl"
          >
            <Page
              pageNumber={pageNumber}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="max-w-full"
              width={window.innerWidth > 800 ? 800 : window.innerWidth - 40}
            />
          </Document>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-md px-4 py-2 rounded-full text-sm text-gray-300 pointer-events-none z-40">
            Page {pageNumber} of {numPages || '--'}
          </div>

          {/* Navigation Zones */}
          <div className="fixed left-0 top-0 h-full w-1/4 cursor-pointer z-20 hover:bg-white/5 transition-colors" onClick={handlePrevPage} />
          <div className="fixed right-0 top-0 h-full w-1/4 cursor-pointer z-20 hover:bg-white/5 transition-colors" onClick={handleNextPage} />
        </div>
      );
    }
    if (book.fileType === 'epub') {
      return (
        <div className="w-full h-full relative">
          {showBookmark && (
            <div className="absolute top-0 right-12 z-10 text-cyan-400 animate-bookmark" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
              <BookmarkIcon />
            </div>
          )}
          <EpubReader
            ref={epubReaderRef}
            file={book.file}
            fontSize={fontSize}
            fontFamily={fontFamily}
            margin={margin}
            lineHeight={lineHeight}
            initialLocation={book.lastKnownLocation}
            onLocationChange={handleLocationChange}
            customFonts={customFonts}
          />
          <div className="absolute left-0 top-0 h-full w-1/4 cursor-pointer" onClick={handlePrevPage} />
          <div className="absolute right-0 top-0 h-full w-1/4 cursor-pointer" onClick={handleNextPage} />
        </div>
      );
    }
    const isUnsupportedEbook = ['azw', 'azw3'].includes(book.fileType);
    if (isUnsupportedEbook) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-300">
          <h2 className="text-2xl font-bold mb-2 text-white">Unsupported File Format</h2>
          <p className="max-w-md">ARCHIVE cannot open <strong>.{book.fileType}</strong> files directly. These are often proprietary Kindle formats.</p>
          <p className="mt-4 max-w-md">For the best experience, we recommend using a free tool like <a href="https://calibre-ebook.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Calibre</a> to convert your books to the open EPUB format before adding them to your library.</p>
        </div>
      );
    }
    return (
      <div className="flex-grow overflow-y-auto p-8 md:p-16 lg:p-24" style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, lineHeight: lineHeight, padding: `${margin}px` }}>
        <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
        <h2 className="text-xl text-gray-400 mb-12">{book.author}</h2>
        <p>This file type is not currently supported for reading.</p>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen pl-[80px] flex flex-col relative">
      <div className="flex-grow overflow-hidden">{renderContent()}</div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-30">
        {isSettingsOpen && book.fileType === 'epub' && (
          <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg shadow-2xl flex flex-col gap-4 w-64 animate-fade-in-up">
            <div>
              <label className="text-xs text-gray-400">Font Size: {fontSize}px</label>
              <input type="range" min="12" max="36" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Margins: {margin}px</label>
              <input type="range" min="0" max="100" step="2" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Line Height: {lineHeight.toFixed(1)}</label>
              <input type="range" min="1.2" max="2.2" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Font Family</label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 mt-1">
                <option value="Default">Default</option>
                {customFonts.map(font => (<option key={font.id} value={font.name}>{font.name}</option>))}
              </select>
            </div>
          </div>
        )}
        <div className="flex gap-4 self-end">
          <button onClick={() => setIsAboutPanelOpen(true)} className="bg-gray-700 hover:bg-gray-600 text-white w-14 h-14 shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105 flex items-center justify-center" title="About this book">
            <AboutIcon />
          </button>
          {book.fileType === 'epub' && (
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-gray-700 hover:bg-gray-600 text-white w-14 h-14 shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105 flex items-center justify-center" title="Reading Settings">
              <SettingsIcon />
            </button>
          )}
        </div>
      </div>

      <AboutPanel isOpen={isAboutPanelOpen} onClose={() => setIsAboutPanelOpen(false)} book={book} />
    </div>
  );
};

export default ReaderView;