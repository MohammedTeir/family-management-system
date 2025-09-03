// Font loading utility for jsPDF
import { fetchApi } from "./api";
import AmiriRegular from '../assets/fonts/Amiri/Amiri-Regular.ttf';
import AmiriBold from '../assets/fonts/Amiri/Amiri-Bold.ttf';

// Function to convert ArrayBuffer to base64 in chunks to avoid stack overflow
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in 8KB chunks
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  
  return btoa(binary);
};

// Function to load font as base64
const loadFontAsBase64 = async (fontPath: string): Promise<string> => {
  try {
    const response = await fetchApi(fontPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return arrayBufferToBase64(arrayBuffer);
  } catch (error) {
    console.error('Error loading font:', error);
    throw error;
  }
};

// Load and add fonts to jsPDF
export const loadAmiriFonts = async (doc: any): Promise<boolean> => {
  try {
    console.log('Loading Amiri fonts...');
    
    // Load regular font
    console.log('Loading Amiri Regular...');
    const regularBase64 = await loadFontAsBase64(AmiriRegular);
    doc.addFileToVFS('Amiri-Regular.ttf', regularBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    
    // Load bold font
    console.log('Loading Amiri Bold...');
    const boldBase64 = await loadFontAsBase64(AmiriBold);
    doc.addFileToVFS('Amiri-Bold.ttf', boldBase64);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
    
    console.log('Amiri fonts loaded successfully!');
    return true;
  } catch (error) {
    console.error('Error loading Amiri fonts:', error);
    return false;
  }
};

// Alternative: Use a pre-converted base64 string (if the above still fails)
export const loadAmiriFontsPreConverted = async (doc: any): Promise<boolean> => {
  try {
    // This would contain the pre-converted base64 strings
    // You would need to convert your font files to base64 strings offline
    // and paste them here
    console.log('Using pre-converted font data...');
    
    // Example structure (you would replace these with actual base64 strings):
    // const regularBase64 = "data:font/ttf;base64,AAEAAAALAIAAAwAwR1NVQiCLJXoAAAE4AAAAVE9TLzL4Xy...";
    // const boldBase64 = "data:font/ttf;base64,AAEAAAALAIAAAwAwR1NVQiCLJXoAAAE4AAAAVE9TLzL4Xy...";
    
    // doc.addFileToVFS('Amiri-Regular.ttf', regularBase64);
    // doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    
    return false; // Return false for now since we don't have the pre-converted data
  } catch (error) {
    console.error('Error loading pre-converted fonts:', error);
    return false;
  }
};

// Alternative approach: Use a simpler method that doesn't require base64 conversion
export const loadAmiriFontsSimple = async (doc: any) => {
  try {
    // For now, let's use a simpler approach without custom fonts
    // jsPDF has built-in support for some Arabic text
    console.log('Using default font for Arabic text');
    return false;
  } catch (error) {
    console.error('Error loading fonts:', error);
    return false;
  }
};

// Alternative: Use a CDN approach if needed
export const loadAmiriFontsFromCDN = async (doc: any) => {
  try {
    // This approach uses a CDN-hosted version of the font
    // Note: This may not work in all environments due to CORS restrictions
    const fontUrl = 'https://cdn.jsdelivr.net/npm/@fontsource/amiri@4.5.12/files/amiri-latin-400-normal.woff2';
    
    const response = await fetchApi(fontUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch font from CDN');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    doc.addFileToVFS('Amiri-Regular.ttf', base64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    
    return true;
  } catch (error) {
    console.error('Error loading Amiri fonts from CDN:', error);
    return false;
  }
}; 