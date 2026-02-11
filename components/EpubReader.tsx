import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { Font } from '../types';

interface EpubReaderProps {
  file: File;
  fontSize: number;
  fontFamily: string;
  margin: number;
  lineHeight: number;
  customFonts: Font[];
  initialLocation?: string;
  onLocationChange: (location: string) => void;
}

export interface EpubReaderRef {
  nextPage: () => void;
  prevPage: () => void;
}

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(({ file, fontSize, fontFamily, margin, lineHeight, customFonts, initialLocation, onLocationChange }, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const fontUrlRef = useRef<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Effect to manage the ResizeObserver, tied to the component's lifecycle.
  useEffect(() => {
    const viewerElement = viewerRef.current;
    if (!viewerElement) return;

    const observer = new ResizeObserver(entries => {
      window.requestAnimationFrame(() => {
        const rendition = renditionRef.current;
        if (!rendition || entries.length === 0) {
          return;
        }

        const { width, height } = entries[0].contentRect;
        const roundedWidth = Math.round(width);
        const roundedHeight = Math.round(height);

        if (sizeRef.current.width !== roundedWidth || sizeRef.current.height !== roundedHeight) {
          sizeRef.current = { width: roundedWidth, height: roundedHeight };
          rendition.resize(roundedWidth, roundedHeight);
        }
      });
    });

    observer.observe(viewerElement);
    return () => observer.disconnect();
  }, []); // Empty dependency array ensures this runs only once.

  // Effect to manage the book and rendition lifecycle, tied to the file prop.
  useEffect(() => {
    const viewerElement = viewerRef.current;
    if (!file || !viewerElement) return;

    let isEffectActive = true;
    let book: any = null;
    let rendition: any = null;

    const loadBook = async () => {
      try {
        // Read file as ArrayBuffer for better compatibility with epubjs archive
        const arrayBuffer = await file.arrayBuffer();

        if (!isEffectActive) return;

        // Create new book instance with ArrayBuffer
        book = ePub(arrayBuffer);

        // Wait for the book to be ready before rendering
        await book.ready;

        if (!isEffectActive) return;

        rendition = book.renderTo(viewerElement, {
          flow: 'paginated',
          spread: 'auto',
          width: viewerElement.clientWidth,
          height: viewerElement.clientHeight,
        });

        // Register a hook to intercept and fix image URLs
        rendition.hooks.content.register((contents: any) => {
          const doc = contents.document;
          const images = doc.querySelectorAll('img, image'); // Include SVG <image> tags
          const sectionHref = contents.section?.href || ''; // Safely access href

          images.forEach(async (element: any) => {
            const src = element.getAttribute('src') || element.getAttribute('xlink:href') || element.getAttribute('href');

            if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:')) {
              try {
                const decodedSrc = decodeURIComponent(src); // Handle spaces and special chars
                let url = book.path.resolve(decodedSrc, sectionHref);
                let blobUrl = null;

                // 2. Try to create a Blob URL from the archive
                try {
                  blobUrl = await book.archive.createUrl(url);
                } catch (createError) {
                  // Fail silently, used for flow control
                }

                // 3. Fallback: Case-insensitive search if strict lookup failed
                if (!blobUrl && book.archive && book.archive.zip && book.archive.zip.files) {
                  const fileName = decodedSrc.split(/[/\\]/).pop()?.toLowerCase();
                  if (fileName) {
                    const keys = Object.keys(book.archive.zip.files);
                    const match = keys.find(key =>
                      key.toLowerCase().endsWith('/' + fileName) ||
                      key.toLowerCase() === fileName
                    );

                    if (match) {
                      try {
                        // Try the standard way again with the matched path
                        blobUrl = await book.archive.createUrl(match);
                      } catch (fuzzyError) {
                        // 4. Manual Extraction Fallback
                        try {
                          const zipFile = book.archive.zip.file(match);
                          if (zipFile) {
                            const blob = await zipFile.async("blob");
                            blobUrl = URL.createObjectURL(blob);
                          }
                        } catch (manualError) {
                          console.error(`[Reader] Manual extraction failed for ${match}`, manualError);
                        }
                      }
                    }
                  }
                }

                if (blobUrl && isEffectActive) {
                  if (element.tagName.toLowerCase() === 'img') {
                    element.src = blobUrl;
                    element.style.maxWidth = "100%";
                  } else {
                    // For SVG <image>
                    if (element.hasAttribute('xlink:href')) {
                      element.setAttribute('xlink:href', blobUrl);
                    } else {
                      element.setAttribute('href', blobUrl);
                    }
                  }
                }
              } catch (e) {
                console.error(`[Reader] Critical error processing image '${src}':`, e);
              }
            }
          });
        });

        // Immediately update the ref
        renditionRef.current = rendition;

        // Store the initial size.
        sizeRef.current = {
          width: Math.round(viewerElement.clientWidth),
          height: Math.round(viewerElement.clientHeight),
        };

        setIsReady(false);
        try {
          await rendition.display(initialLocation);
          if (isEffectActive) {
            setIsReady(true);
          }
        } catch (err) {
          console.error("Error displaying book:", err);
        }

        rendition.on('relocated', (location: any) => {
          if (location.start?.cfi) {
            onLocationChangeRef.current(location.start.cfi);
          }
        });
      } catch (err) {
        console.error("Error loading book:", err);
        setIsReady(true); // Ensure loading state doesn't hang forever
      }
    };

    loadBook();

    // The cleanup function for THIS effect instance.
    return () => {
      isEffectActive = false;

      // Clean up font URLs created for this book instance.
      fontUrlRef.current.forEach(url => URL.revokeObjectURL(url));
      fontUrlRef.current = [];

      // Destroy the book and rendition that were created in this effect.
      if (book) {
        book.destroy();
      }
      if (rendition) {
        rendition.destroy();
      }

      // Nullify the ref if it's pointing to the rendition we just destroyed.
      if (renditionRef.current === rendition) {
        renditionRef.current = null;
      }
    };
  }, [file, initialLocation]);

  // Effect for applying theme and font settings.
  useEffect(() => {
    const rendition = renditionRef.current;
    // Check for rendition readiness and that the book is open.
    if (!rendition || !isReady || !rendition.book.isOpen) return;

    // 1. Clean up previous font blob URLs
    fontUrlRef.current.forEach(url => URL.revokeObjectURL(url));
    fontUrlRef.current = [];

    // 2. Generate and inject @font-face rules
    const fontFaceCss = customFonts.map(font => {
      const url = URL.createObjectURL(font.file);
      fontUrlRef.current.push(url); // Store for future cleanup
      return `
        @font-face {
          font-family: "${font.name}";
          src: url(${url});
        }
      `;
    }).join('\n');

    rendition.getContents().forEach(content => {
      let style = content.document.getElementById('custom-fonts-style');
      if (!style) {
        style = content.document.createElement('style');
        style.id = 'custom-fonts-style';
        content.document.head.appendChild(style);
      }
      style.textContent = fontFaceCss;
    });

    // 3. Apply the theme with all current settings
    const currentFontFamily = fontFamily === 'Default' ? `"Times New Roman", serif` : `"${fontFamily}", "Times New Roman", serif`;

    rendition.themes.register("custom", {
      "body": {
        "padding": `${margin}px !important`,
        "line-height": `${lineHeight} !important`,
        "font-size": `${fontSize}px !important`,
        "font-family": `${currentFontFamily} !important`,
        "color": "#111827",
      }
    });
    rendition.themes.select("custom");

  }, [fontSize, fontFamily, margin, lineHeight, customFonts, isReady]);

  useImperativeHandle(ref, () => ({
    nextPage: () => {
      renditionRef.current?.next();
    },
    prevPage: () => {
      renditionRef.current?.prev();
    },
  }));

  return <div ref={viewerRef} className="w-full h-full bg-gray-100" />;
});

export default EpubReader;