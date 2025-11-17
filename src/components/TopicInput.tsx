import React, { useState } from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { Loader } from './Loader';
import InstructionsModal from './InstructionsModal';

interface TopicInputProps {
  onStart: (topic: string, language: Language) => void;
  isLoading: boolean;
  error: string | null;
}

const TopicInput: React.FC<TopicInputProps> = ({ onStart, isLoading, error }) => {
  const [topic, setTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && selectedLanguage) {
      onStart(topic, selectedLanguage);
    }
  };

  return (
    <>
        <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="w-full max-w-lg text-center p-8 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-100">Let's Get Started!</h2>
                <p className="text-slate-400 mb-6">Enter a topic and select a language to practice.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="topic" className="sr-only">Topic</label>
                        <input
                            id="topic"
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Food, Travel, Technology"
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg placeholder-slate-400 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="language" className="sr-only">Language</label>
                        <select
                            id="language"
                            value={selectedLanguage.code}
                            onChange={(e) => {
                                const lang = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                                if (lang) setSelectedLanguage(lang);
                            }}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition appearance-none bg-no-repeat bg-right-4"
                            style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em'}}
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code} className="bg-slate-800">
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-6 py-3 font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed transform hover:scale-105"
                    >
                        {isLoading ? <Loader /> : 'Start Practice'}
                    </button>
                </form>
                {error && <p className="mt-4 text-red-400">{error}</p>}
            </div>
            <div className="mt-8">
                <button 
                    onClick={() => setShowInstructions(true)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                    How to Use This App?
                </button>
            </div>
        </div>
        {showInstructions && (
            <InstructionsModal 
                language={selectedLanguage} 
                onClose={() => setShowInstructions(false)} 
            />
        )}
    </>
  );
};

export default TopicInput;