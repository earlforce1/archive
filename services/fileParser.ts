
import { Book, Font } from '../types';
import { METRO_COLORS } from '../constants';
import JSZip from 'jszip';

const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const cleanHtmlString = (htmlString: string | null | undefined): string => {
  if (!htmlString) return '';
  // Use the DOM to decode HTML entities (e.g., &amp; -> &)
  const textarea = document.createElement('textarea');
  textarea.innerHTML = htmlString;
  const decodedString = textarea.value;
  // Strip the HTML tags
  return decodedString.replace(/<[^>]*>/g, '').trim();
};

const parseEpub = async (file: File): Promise<Partial<Book>> => {
    try {
        const zip = await JSZip.loadAsync(file);
        const containerFile = zip.file('META-INF/container.xml');
        if (!containerFile) return {};

        const containerText = await containerFile.async('text');
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerText, 'application/xml');
        const contentFilePath = containerDoc.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
        if (!contentFilePath) return {};

        const contentFile = zip.file(contentFilePath);
        if (!contentFile) return {};
        
        const contentText = await contentFile.async('text');
        const contentDoc = parser.parseFromString(contentText, 'application/xml');
        
        const metadata = contentDoc.getElementsByTagName('metadata')[0];
        const manifest = contentDoc.getElementsByTagName('manifest')[0];

        const title = metadata.getElementsByTagName('dc:title')[0]?.textContent || file.name.replace(/\.[^/.]+$/, "");
        const author = metadata.getElementsByTagName('dc:creator')[0]?.textContent || 'Unknown Author';
        const publisher = metadata.getElementsByTagName('dc:publisher')[0]?.textContent;
        const rawSynopsis = metadata.getElementsByTagName('dc:description')[0]?.textContent;
        const synopsis = cleanHtmlString(rawSynopsis);

        let series: string | undefined;
        let seriesNumber: number | undefined;

        const collectionMeta = metadata.querySelector('meta[property="belongs-to-collection"]');
        if (collectionMeta && collectionMeta.textContent) {
            series = collectionMeta.textContent.trim();
            const positionMeta = metadata.querySelector('meta[property="group-position"]');
            if (positionMeta && positionMeta.textContent) {
                const parsedNum = parseFloat(positionMeta.textContent);
                if (!isNaN(parsedNum)) seriesNumber = parsedNum;
            }
        } else {
            const seriesMetaCalibre = metadata.querySelector('meta[name="calibre:series"]');
            if (seriesMetaCalibre) {
                const content = seriesMetaCalibre.getAttribute('content');
                if (content) series = content.trim();
                
                const seriesIndexMeta = metadata.querySelector('meta[name="calibre:series_index"]');
                if (seriesIndexMeta) {
                    const indexContent = seriesIndexMeta.getAttribute('content');
                    if (indexContent) {
                        const parsedNum = parseFloat(indexContent);
                        if (!isNaN(parsedNum)) seriesNumber = parsedNum;
                    }
                }
            }
        }

        let coverImage: string | undefined;
        let coverImageHref: string | null = null;
        
        const coverMeta = Array.from(metadata.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
        if (coverMeta) {
            const coverId = coverMeta.getAttribute('content');
            if (coverId) {
                const coverItem = manifest.querySelector(`item[id="${coverId}"]`);
                coverImageHref = coverItem?.getAttribute('href');
            }
        }
        
        if (!coverImageHref) {
            const coverItem = manifest.querySelector(`item[properties*="cover-image"]`);
            coverImageHref = coverItem?.getAttribute('href');
        }

        if (coverImageHref) {
            const contentDir = contentFilePath.substring(0, contentFilePath.lastIndexOf('/'));
            const coverPath = (contentDir ? contentDir + '/' : '') + coverImageHref;
            const coverFile = zip.file(coverPath);
            if (coverFile) {
                const coverBlob = await coverFile.async('blob');
                coverImage = await blobToBase64(coverBlob);
            }
        }

        return { title, author, coverImage, publisher, synopsis, series, seriesNumber };

    } catch (error) {
        console.error("Error parsing EPUB:", error);
        return {};
    }
};


export const parseFile = async (file: File): Promise<Omit<Book, 'id'> | Omit<Font, 'id'>> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const fileName = file.name.replace(/\.[^/.]+$/, "");

  if (fileExtension === 'ttf' || fileExtension === 'otf') {
      return {
          name: fileName,
          file,
      };
  }

  let bookData: Partial<Book> = {};
  if (fileExtension === 'epub') {
      bookData = await parseEpub(file);
  }

  const book: Omit<Book, 'id'> = {
    title: bookData.title || fileName,
    author: bookData.author || 'Unknown Author',
    fileType: fileExtension || 'unknown',
    file: file,
    color: METRO_COLORS[Math.abs(hashCode(bookData.title || fileName)) % METRO_COLORS.length],
    publisher: bookData.publisher || 'Unknown Publisher',
    synopsis: bookData.synopsis || `No synopsis available for "${bookData.title || fileName}".`,
    coverImage: bookData.coverImage,
    series: bookData.series,
    seriesNumber: bookData.seriesNumber
  };
  
  return book;
};