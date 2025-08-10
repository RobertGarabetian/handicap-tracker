import { createWorker } from 'tesseract.js';

export interface OCRResult {
  course: string;
  rating: number;
  slope: number;
  gross: number;
  ocrRaw: string;
}

export const preprocessImage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  // Convert to grayscale
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;     // red
    data[i + 1] = gray; // green
    data[i + 2] = gray; // blue
  }
  
  // Apply threshold
  const threshold = 128;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i];
    const binary = gray > threshold ? 255 : 0;
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
  }
  
  ctx.putImageData(imageData, 0, 0);
};

export const parseOCRText = (text: string): Partial<OCRResult> => {
  const result: Partial<OCRResult> = { ocrRaw: text };
  
  // Parse Gross/Total
  const grossMatch = text.match(/(?:Total|Gross)[:\s]*(\d{2,3})/i);
  if (grossMatch) {
    result.gross = parseInt(grossMatch[1]);
  }
  
  // Parse Course Rating
  const ratingMatch = text.match(/(?:Course\s*Rating|CR|Rating)[:\s]*(\d{2}\.\d)/i);
  if (ratingMatch) {
    result.rating = parseFloat(ratingMatch[1]);
  }
  
  // Parse Slope
  const slopeMatch = text.match(/(?:Slope|SR)[:\s]*(\d{2,3})/i);
  if (slopeMatch) {
    result.slope = parseInt(slopeMatch[1]);
  }
  
  // Parse Course Name (basic heuristic)
  const courseMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Golf|Country|Club|Course|Links))/);
  if (courseMatch) {
    result.course = courseMatch[1];
  }
  
  return result;
};

export const performOCR = async (imageFile: File): Promise<OCRResult> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = async () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Preprocess the image
        preprocessImage(canvas, ctx);
        
        // Perform OCR
        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789.-/ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        });
        
        const { data: { text } } = await worker.recognize(canvas);
        await worker.terminate();
        
        const parsed = parseOCRText(text);
        resolve({
          course: parsed.course || 'Unknown Course',
          rating: parsed.rating || 72.0,
          slope: parsed.slope || 113,
          gross: parsed.gross || 0,
          ocrRaw: text
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });
};
