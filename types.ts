export interface Book {
  id: number;
  title: string;
  author: string;
  fileType: string;
  coverImage?: string; // base64 string
  file: File;
  color: string;
  series?: string;
  seriesNumber?: number;
  publisher?: string;
  synopsis?: string;
  lastKnownLocation?: string; // for EPUB CFI
  status?: 'started' | 'finished';
  fontSize?: number;
  fontFamily?: string;
  margin?: number;
  lineHeight?: number;
}

export interface Font {
  id: number;
  name: string;
  file: File;
}

export type View = 'landing' | 'library' | 'reader';

export type Pivot = 'authors' | 'series';