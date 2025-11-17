
import React, { useState, useCallback } from 'react';
import TopicInput from './components/TopicInput';
import WordList from './components/WordList';
import { generateWords } from './services/geminiService';
import { AppState, Language } from './types';
import { SparklesIcon } from './components/icons/SparklesIcon';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [topic, setTopic] = useState<string>('');
  const [language, setLanguage] = useState<Language | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartPractice = useCallback(async (newTopic: string, newLanguage: Language) => {
    setIsLoading(true);
    setError(null);
    try {
      const generatedWords = await generateWords(newTopic, newLanguage.name);
      setTopic(newTopic);
      setLanguage(newLanguage);
      setWords(generatedWords);
      setAppState(AppState.PRACTICE);
    } catch (err: any) {
      setError(err.message || 'Failed to generate words. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = () => {
    setAppState(AppState.INPUT);
    setTopic('');
    setLanguage(null);
    setWords([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
            Pronunciation Coach
          </h1>
        </div>
        {appState === AppState.PRACTICE && (
            <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
                New Topic
            </button>
        )}
      </header>
      
      <main className="w-full max-w-4xl flex-grow">
        {appState === AppState.INPUT && (
          <TopicInput onStart={handleStartPractice} isLoading={isLoading} error={error} />
        )}
        {appState === AppState.PRACTICE && language && (
          <WordList topic={topic} language={language} words={words} />
        )}
      </main>
    </div>
  );
};

export default App;
