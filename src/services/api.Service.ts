import { Assessment } from '../types';

// This service communicates with our own backend serverless function,
// not directly with the Google GenAI API.

async function apiRequest(action: string, payload: any) {
    const response = await fetch('/api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export function generateWords(topic: string, language: string): Promise<string[]> {
    return apiRequest('generateWords', { topic, language });
}

export function generateSpeech(text: string, voice: string): Promise<string> {
    return apiRequest('generateSpeech', { text, voice });
}

export function assessPronunciation(word: string, language: string, userAudioBase64: string, mimeType: string): Promise<Assessment> {
    return apiRequest('assessPronunciation', { word, language, userAudioBase64, mimeType });
}

export function getTranslatedInstructions(languageName: string): Promise<string> {
    return apiRequest('getTranslatedInstructions', { languageName });
}
