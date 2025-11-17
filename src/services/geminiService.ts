import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Assessment } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxRetries) {
        try {
            return await apiCall();
        } catch (error: any) {
            attempt++;
            const isRetryable = error.message?.includes('503') || error.message?.includes('UNAVAILABLE') || error.message?.includes('overloaded');
            
            if (isRetryable && attempt < maxRetries) {
                console.warn(`API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`, error.message);
                await sleep(delay);
                delay *= 2; // Exponential backoff
            } else {
                if (isRetryable) {
                    console.error(`API call failed after ${maxRetries} attempts.`, error);
                    throw new Error("The AI service is currently busy. Please try again in a few moments.");
                }
                // For non-retryable errors, rethrow immediately
                throw error;
            }
        }
    }
    // This line should not be reachable, but it satisfies TypeScript's need for a return path.
    throw new Error("API call failed after multiple retries.");
}


export async function generateWords(topic: string, language: string): Promise<string[]> {
    return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Generate a list of 10 common, single words related to the topic '${topic}' in ${language}. The words should be suitable for a language learner.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            words: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['words']
                    }
                }
            });
            
            let jsonText = response.text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.substring(7, jsonText.length - 3).trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.substring(3, jsonText.length - 3).trim();
            }

            const result = JSON.parse(jsonText);
            
            if (!result.words || !Array.isArray(result.words)) {
                throw new Error("Invalid response format from API: 'words' array not found.");
            }

            return (result.words || []).slice(0, 10);
        } catch (error) {
            console.error("Error processing words response:", error);
            throw error; // Re-throw to be caught by withRetry or the caller
        }
    });
}

export async function generateSpeech(text: string, voice: string): Promise<string> {
    return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Pronounce the word: ${text}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voice },
                        },
                    },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
                throw new Error("No audio data received from TTS API");
            }
            return base64Audio;
        } catch (error) {
            console.error(`Error generating speech for "${text}":`, error);
            throw error;
        }
    });
}

export async function assessPronunciation(word: string, language: string, userAudioBase64: string, mimeType: string): Promise<Assessment> {
    return withRetry(async () => {
        const prompt = `You are a language pronunciation expert. The target word is '${word}' in ${language}. A non-native speaker has pronounced it. The provided audio is their attempt. Analyze the pronunciation in the audio. Provide a score from 1 to 100 on how close it is to a native speaker's pronunciation, where 100 is perfect. Also, provide a short, constructive, and encouraging feedback on what can be improved.`;
        try {
            const audioPart = {
                inlineData: {
                    data: userAudioBase64,
                    mimeType: mimeType,
                },
            };

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [{ text: prompt }, audioPart] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.INTEGER },
                            feedback: { type: Type.STRING }
                        },
                        required: ['score', 'feedback']
                    }
                }
            });
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        } catch (error) {
            console.error("Error processing pronunciation assessment:", error);
            throw error;
        }
    });
}

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

export async function getTranslatedInstructions(languageName: string): Promise<string> {
    if (languageName.toLowerCase() === 'english') {
        return BASE_INSTRUCTIONS;
    }
    return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Translate the following instructions for a web application into ${languageName}. Keep the formatting (like the bolded parts and numbered list) the same. Do not add any extra text, preamble, or explanation. Just provide the translated text.\n\n---\n\n${BASE_INSTRUCTIONS}`,
            });
            return response.text;
        } catch (error) {
            console.error(`Error translating instructions to ${languageName}:`, error);
            throw new Error(`Failed to translate to ${languageName}`);
        }
    });
}
