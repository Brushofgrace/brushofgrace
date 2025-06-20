// services/aiDescriptionService.ts
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Artwork } from '../types'; // Assuming Artwork type might be useful or for context

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Changed from API_KEY

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY for Gemini is not defined in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY }); // Use the corrected variable
const model = 'gemini-2.5-flash-preview-04-17'; // Vision capable model

// Helper function to convert File to base64 for Gemini API
const fileToGenerativePart = (file: File): Promise<{ inlineData: { data: string, mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('Failed to read file as data URL.'));
      }
      // Result includes 'data:mime/type;base64,' prefix, remove it.
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Generates a description for an artwork image using Gemini API.
 * Instructs AI to embed a title within the description using **Title Here** format.
 * @param imageFile The image file.
 * @param originalTitle The original/filename-derived title of the artwork, used as context.
 * @returns A promise that resolves with the AI-generated description.
 */
export const generateDescription = async (imageFile: File, originalTitle: string): Promise<string> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = {
      text: `Analyze the following artwork. 
      First, create a concise and creative title for this artwork and enclose it in double asterisks, like this: **Creative Artwork Title**.
      Then, provide a detailed description. Focus on its visual elements, style, potential mood, and theme. 
      The original filename was "${originalTitle}". You can use this for inspiration or ignore it if you come up with a better title.
      The description should be suitable for a gallery.`,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      // Optional: Add config like temperature if needed
      // config: { temperature: 0.7 }
    });

    const description = response.text;
    if (!description) {
      console.error('Gemini API returned no text description.');
      throw new Error('Failed to generate description: No text returned.');
    }
    return description.trim();
  } catch (error) {
    console.error('Error generating description with Gemini API:', error);
    // It's good to check for specific error types from the SDK if available
    // and provide more user-friendly messages.
    if (error instanceof Error) {
        throw new Error(`AI description generation failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred while generating AI description.');
  }
};