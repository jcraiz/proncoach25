
import React, { useState, useEffect } from 'react';
import { Assessment, Language } from '../types';
import { generateSpeech } from '../services/geminiService';
import PronunciationCard from './PronunciationCard';
import { Loader } from './Loader';
import OverallScore from './OverallScore';

interface WordListProps {
  topic: string;
  language: Language;
  words: string[];
}

interface WordData {
  word: string;
  nativeAudioBase64: string | null;
}

const WordList: React.FC<WordListProps> = ({ topic, language, words }) => {
  const [wordData, setWordData] = useState<WordData[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(true);
  const [assessments, setAssessments] = useState<(Assessment | null)[]>(() => new Array(words.length).fill(null));

  useEffect(() => {
    const fetchAllAudio = async () => {
      setIsLoadingAudio(true);
      try {
        const audioPromises = words.map(word => 
          generateSpeech(word, language.voice).catch(e => {
            console.error(`Failed to get audio for ${word}`, e);
            return null;
          })
        );
        const audioResults = await Promise.all(audioPromises);
        const newWordData = words.map((word, index) => ({
          word,
          nativeAudioBase64: audioResults[index],
        }));
        setWordData(newWordData);
      } catch (error) {
        console.error("Error fetching native audio:", error);
        setWordData(words.map(word => ({ word, nativeAudioBase64: null })));
      } finally {
        setIsLoadingAudio(false);
      }
    };

    if (words.length > 0) {
      fetchAllAudio();
    }
  }, [words, language.voice]);

  const handleAssessmentChange = (index: number, assessment: Assessment | null) => {
    setAssessments(currentAssessments => {
        const newAssessments = [...currentAssessments];
        newAssessments[index] = assessment;
        return newAssessments;
    });
  };

  const completedCount = assessments.filter(Boolean).length;
  const allDone = words.length > 0 && completedCount === words.length;
  const overallScore = allDone ? Math.round(assessments.reduce((sum, a) => sum + (a?.score || 0), 0) / words.length) : 0;

  if (isLoadingAudio) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <Loader />
        <p className="mt-4 text-slate-300">Generating native audio...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-center mb-2">
            Topic: <span className="text-cyan-400 capitalize">{topic}</span>
        </h2>
        <p className="text-center text-slate-400 mb-8">
            Practice these {language.name} words. Listen to the native speaker, then record yourself.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {wordData.map((data, index) => (
                <PronunciationCard
                    key={index}
                    word={data.word}
                    language={language.name}
                    nativeAudioBase64={data.nativeAudioBase64}
                    assessment={assessments[index]}
                    onAssessmentChange={(newAssessment) => handleAssessmentChange(index, newAssessment)}
                />
            ))}
        </div>
        {allDone && <OverallScore score={overallScore} />}
    </div>
  );
};

export default WordList;