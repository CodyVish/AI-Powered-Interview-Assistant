import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { ResumeFields } from '../types';

// Configure pdfjs worker to use from CDN for simplicity
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /(\+\d{1,3}[- ]?)?\d{10,12}/;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => ('str' in it ? it.str : '')).filter(Boolean);
    text += strings.join(' ') + '\n';
  }
  return text;
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value || '';
}

export function parseResumeFields(text: string): ResumeFields {
  const lines = text.split(/\n|\r/).map((l) => l.trim()).filter(Boolean);
  const joined = lines.join(' ');
  const emailMatch = joined.match(EMAIL_REGEX)?.[0];
  const phoneMatch = joined.match(PHONE_REGEX)?.[0];
  // Naive name guess: first non-empty line without digits and not containing email/phone
  const nameLine = lines.find((l) => !/\d/.test(l) && (!emailMatch || !l.includes(emailMatch)) && l.length <= 60);
  const name = nameLine?.split('|')[0]?.trim();
  return { name, email: emailMatch ?? undefined, phone: phoneMatch ?? undefined };
}


