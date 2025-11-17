import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Assessment } from '../src/types';

// This function will be deployed as a serverless function (e.g., on Vercel).
// It acts as a secure backend-for-frontend (BFF).

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Caching Implementation ---
// A simple in-memory cache. For larger scale, a distributed cache like Redis would be used.
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function setCache(key: string, data: any) {
    cache.set(key, { timestamp: Date.now(), data });
}

function getCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
        return entry.data as T;
    }
    cache.delete(key); // Expired entry
    return null;
}

// --- API Logic with Retry ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let attempt = 0;
    let delay = initialDelay;
    while (attempt < maxRetries) {
        try {
            return await apiCall();
        } catch (error: any) {
            attempt++;
            const isRetryable = error.message?.includes('503') || error.message?.includes('UNAVAILABLE') || error.message?.includes('overloaded') || error.status === 503;
            if (isRetryable && attempt < maxRetries) {
                console.warn(`API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
                await sleep(delay);
                delay *= 2;
            } else {
                 if (isRetryable) {
                    console.error(`API call failed after ${maxRetries} attempts.`, error);
                    throw new Error("The AI service is currently busy. Please try again in a few moments.");
                }
                throw error;
            }
        }
    }
    throw new Error("API call failed after multiple retries.");
}


// --- API Handlers ---

async function handleGenerateWords(topic: string, language: string): Promise<string[]> {
    const cacheKey = `words:${topic.toLowerCase()}:${language.toLowerCase()}`;
    const cached = getCache<string[]>(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a list of 10 common, single words related to the topic '${topic}' in ${language}. The words should be suitable for a language learner.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { words: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ['words']
                }
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        const words = (parsed.words || []).slice(0, 10);
        if (!Array.isArray(words) || words.length === 0) {
            throw new Error("Invalid response format from API.");
        }
        return words;
    });

    setCache(cacheKey, result);
    return result;
}

async function handleGenerateSpeech(text: string, voice: string): Promise<string> {
    const cacheKey = `speech:${text.toLowerCase()}:${voice.toLowerCase()}`;
    const cached = getCache<string>(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Pronounce the word: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data received from TTS API");
        return base64Audio;
    });
    
    setCache(cacheKey, result);
    return result;
}

async function handleAssessPronunciation(word: string, language: string, userAudioBase64: string, mimeType: string): Promise<Assessment> {
    return withRetry(async () => {
        const prompt = `You are a language pronunciation expert. The target word is '${word}' in ${language}. A non-native speaker has pronounced it. The provided audio is their attempt. Analyze the pronunciation in the audio. Provide a score from 1 to 100 on how close it is to a native speaker's pronunciation, where 100 is perfect. Also, provide a short, constructive, and encouraging feedback on what can be improved.`;
        const audioPart = { inlineData: { data: userAudioBase64, mimeType: mimeType } };
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }, audioPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { score: { type: Type.INTEGER }, feedback: { type: Type.STRING } },
                    required: ['score', 'feedback']
                }
            }
        });
        return JSON.parse(response.text.trim());
    });
}


async function handleGetTranslatedInstructions(languageName: string): Promise<string> {
    const BASE_INSTRUCTIONS = `
1.  **Enter a Topic:** Type any subject you want to practice, like "fruits," "traveling," or "business."
2.  **Select a Language:** Choose the language you are learning from the dropdown menu.
3.  **Start Practice:** Click the "Start Practice" button. The AI will generate 10 words related to your topic.
4.  **Listen:** For each word, click the play button (▶️) to hear how a native speaker pronounces it.
5.  **Record:** Click the microphone button (🎤) and pronounce the word clearly.
6.  **Stop & Assess:** Click the stop button (⏹️) when you're done. The AI will analyze your pronunciation.
7.  **Get Feedback:** You will see a score from 1 to 100 and receive tips on how to improve.
8.  **Practice Again:** Try recording again to improve your score, or move to the next word.
`;
    if (languageName.toLowerCase() === 'english') {
        return BASE_INSTRUCTIONS;
    }
    const cacheKey = `instructions:${languageName.toLowerCase()}`;
    const cached = getCache<string>(cacheKey);
    if (cached) return cached;

    const result = await withRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Translate the following instructions for a web application into ${languageName}. Keep the formatting (like the bolded parts and numbered list) the same. Do not add any extra text, preamble, or explanation. Just provide the translated text.\n\n---\n\n${BASE_INSTRUCTIONS}`,
        });
        return response.text;
    });
    setCache(cacheKey, result);
    return result;
}


// --- Main Handler for Serverless Environment ---
export default async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { action, payload } = await req.json();
        let result: any;

        switch (action) {
            case 'generateWords':
                result = await handleGenerateWords(payload.topic, payload.language);
                break;
            case 'generateSpeech':
                result = await handleGenerateSpeech(payload.text, payload.voice);
                break;
            case 'assessPronunciation':
                result = await handleAssessPronunciation(payload.word, payload.language, payload.userAudioBase64, payload.mimeType);
                break;
            case 'getTranslatedInstructions':
                 result = await handleGetTranslatedInstructions(payload.languageName);
                break;
            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('API Error:', error);
        const errorMessage = error.message || 'An internal server error occurred.';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};