
import React from 'react';
import { Book } from '../types';
import { StarIcon, StarOutlineIcon } from './icons/Icons';

interface BookTileProps {
  book: Book;
  onClick: (book: Book) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  size?: 'small' | 'medium' | 'large';
}

const toRoman = (num: number | undefined): string => {
    if (num === undefined || isNaN(num) || num < 1) return num?.toString() || ''; // Fallback for non-standard numbers
    const romanMap: { [key: number]: string } = {
        1000: 'M', 900: 'CM', 500: 'D', 400: 'CD', 100: 'C',
        90: 'XC', 50: 'L', 40: 'XL', 10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I'
    };
    let result = '';
    const keys = Object.keys(romanMap).map(Number).sort((a, b) => b - a);
    let currentNum = Math.floor(num); // Ensure we're working with an integer
    for (const key of keys) {
        while (currentNum >= key) {
            result += romanMap[key];
            currentNum -= key;
        }
    }
    return result;
};

const formatAuthorName = (author: string): string => {
  if (author === 'Unknown Author') return author;
  const parts = author.trim().split(' ');
  if (parts.length > 1) {
    const lastName = parts.pop();
    return `${lastName}, ${parts.join(' ')}`;
  }
  return author;
};

const TypographicCover: React.FC<{ book: Book, size: 'small' | 'medium' | 'large' }> = ({ book, size }) => {
  const sizeClasses = {
    small: { title: 'text-lg', author: 'text-xs', container: 'h-48 w-32' },
    medium: { title: 'text-2xl', author: 'text-sm', container: 'h-64 w-44' },
    large: { title: 'text-4xl', author: 'text-base', container: 'h-80 w-56' },
  };

  return (
    <div 
      className={`flex flex-col justify-between p-4 ${sizeClasses[size].container}`}
      style={{ backgroundColor: book.color }}
    >
      <h3 className={`font-bold leading-tight ${sizeClasses[size].title}`}>{book.title}</h3>
      <p className={`self-end ${sizeClasses[size].author}`}>{book.author}</p>
    </div>
  );
};


const BookTile: React.FC<BookTileProps> = ({ book, onClick, onContextMenu, size = 'medium' }) => {
  const sizeClasses = {
    small: { container: 'w-32 h-48', cover: 'h-48' },
    medium: { container: 'w-44 h-64', cover: 'h-64' },
    large: { container: 'w-56 h-80', cover: 'h-80' },
  };

  return (
    <div
      className={`flex-shrink-0 cursor-pointer group transition-transform duration-200 hover:scale-105`}
      onClick={() => onClick(book)}
      onContextMenu={onContextMenu}
    >
      <div className={`relative shadow-lg ${sizeClasses[size].container}`}>
        {book.coverImage ? (
          <img src={book.coverImage} alt={book.title} className={`w-full h-full object-cover`} />
        ) : (
          <TypographicCover book={book} size={size} />
        )}
        {book.status && (
          <div 
            className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5 text-white"
            title={book.status === 'finished' ? 'Finished' : 'Started Reading'}
          >
            {book.status === 'finished' ? <StarIcon /> : <StarOutlineIcon />}
          </div>
        )}
      </div>
      <div className="mt-2 text-left space-y-0.5">
        <p className="font-semibold text-sm text-white truncate group-hover:text-cyan-400">{book.title}</p>
        {book.series && (
          <p className="text-xs text-gray-400 truncate">
            {book.seriesNumber ? `Book ${toRoman(book.seriesNumber)} of ${book.series}` : book.series}
          </p>
        )}
        <p className="text-xs text-gray-500 truncate">{formatAuthorName(book.author)}</p>
      </div>
    </div>
  );
};

export default BookTile;