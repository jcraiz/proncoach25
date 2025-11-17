import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { getTranslatedInstructions } from '../services/geminiService';
import { Loader } from './Loader';
import { CloseIcon } from './icons/CloseIcon';

interface InstructionsModalProps {
    language: Language;
    onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ language, onClose }) => {
    const [instructions, setInstructions] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInstructions = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const translated = await getTranslatedInstructions(language.name);
                setInstructions(translated);
            } catch (err) {
                console.error(err);
                setError(`Could not translate instructions to ${language.name}. Displaying in English.`);
                const englishInstructions = await getTranslatedInstructions('English');
                setInstructions(englishInstructions);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInstructions();
    }, [language]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6 sm:p-8 w-11/12 max-w-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-100">How to Use</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" aria-label="Close instructions">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 text-slate-300">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader />
                        </div>
                    ) : (
                        <div>
                           {error && <p className="text-red-400 mb-4">{error}</p>}
                           <div className="space-y-2" style={{ whiteSpace: 'pre-wrap' }}>
                            {instructions}
                           </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstructionsModal;