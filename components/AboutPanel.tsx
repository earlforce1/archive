
import React from 'react';
import { Book } from '../types';

interface AboutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

const formatAuthorName = (author: string): string => {
  if (author === 'Unknown Author') return author;
  const parts = author.trim().split(' ');
  if (parts.length > 1) {
    const lastName = parts.pop();
    return `${lastName}, ${parts.join(' ')}`;
  }
  return author;
};

const toRoman = (num: number | undefined): string => {
    if (num === undefined || isNaN(num) || num < 1) return num?.toString() || '';
    const romanMap: { [key: number]: string } = {
        1000: 'M', 900: 'CM', 500: 'D', 400: 'CD', 100: 'C',
        90: 'XC', 50: 'L', 40: 'XL', 10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I'
    };
    let result = '';
    const keys = Object.keys(romanMap).map(Number).sort((a, b) => b - a);
    let currentNum = Math.floor(num);
    for (const key of keys) {
        while (currentNum >= key) {
            result += romanMap[key];
            currentNum -= key;
        }
    }
    return result;
};

const AboutPanel: React.FC<AboutPanelProps> = ({ isOpen, onClose, book }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900/80 border border-gray-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the panel
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-xl font-semibold text-cyan-400 mb-6 truncate">About: {book.title}</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">Author</p>
            <p className="text-gray-200">{formatAuthorName(book.author)}</p>
          </div>
          {book.series && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Series</p>
              <p className="text-gray-200">
                {book.seriesNumber ? `Book ${toRoman(book.seriesNumber)} of ${book.series}` : book.series}
              </p>
            </div>
          )}
          {book.publisher && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Publisher</p>
              <p className="text-gray-200">{book.publisher}</p>
            </div>
          )}
          {book.synopsis && (
            <div className="pt-4 mt-4 border-t border-gray-700/50">
              <p className="text-gray-300 italic leading-relaxed">{book.synopsis}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AboutPanel;