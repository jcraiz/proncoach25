
import React, { useState, useCallback } from 'react';
import { Assessment } from '../types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { assessPronunciation } from '../services/geminiService';
import { playBase64Audio, blobToBase64, downloadBase64Audio } from '../utils/audioUtils';
import { Loader } from './Loader';
import { PlayIcon } from './icons/PlayIcon';
import { MicIcon } from './icons/MicIcon';
import { StopIcon } from './icons/StopIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ScoreCircle } from './ScoreCircle';


interface PronunciationCardProps {
  word: string;
  language: string;
  nativeAudioBase64: string | null;
  assessment: Assessment | null;
  onAssessmentChange: (assessment: Assessment | null) => void;
}

const PronunciationCard: React.FC<PronunciationCardProps> = ({ word, language, nativeAudioBase64, assessment, onAssessmentChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size === 0) return;
    setIsLoading(true);
    setError(null);
    try {
        const userAudioBase64 = await blobToBase64(audioBlob);
        const result = await assessPronunciation(word, language, userAudioBase64, audioBlob.type);
        onAssessmentChange(result);
    } catch (err: any) {
        console.error('Assessment failed:', err);
        setError(err.message || 'Could not get assessment. Please try again.');
    } finally {
        setIsLoading(false);
    }
  }, [word, language, onAssessmentChange]);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({ onRecordingComplete: handleRecordingComplete });

  const handlePlayNative = () => {
    if (nativeAudioBase64) {
      playBase64Audio(nativeAudioBase64);
    }
  };

  const handleDownloadNative = () => {
    if (nativeAudioBase64) {
        downloadBase64Audio(nativeAudioBase64, word);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      onAssessmentChange(null);
      setError(null);
      startRecording();
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col gap-4 shadow-md transition-all duration-300 hover:border-cyan-500 hover:shadow-cyan-500/10">
      <div className="flex justify-between items-start">
        <h3 className="text-2xl font-bold capitalize text-white">{word}</h3>
        <div className="flex items-center gap-2">
            {nativeAudioBase64 && (
            <>
                <button
                    onClick={handlePlayNative}
                    className="p-2 rounded-full bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white transition-colors"
                    aria-label={`Listen to ${word}`}
                >
                    <PlayIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleDownloadNative}
                    className="p-2 rounded-full bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white transition-colors"
                    aria-label={`Download audio for ${word}`}
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
            </>
            )}
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center my-4 min-h-[80px]">
        {isLoading ? (
            <div className="text-center">
                <Loader />
                <p className="mt-2 text-sm text-slate-400">Assessing...</p>
            </div>
        ) : assessment ? (
            <div className="flex items-center gap-6 w-full animate-fade-in">
                <ScoreCircle score={assessment.score} />
                <p className="flex-1 text-slate-300 text-sm">{assessment.feedback}</p>
            </div>
        ) : (
            <div className="text-slate-400 text-sm text-center">
                {isRecording ? "Recording... Stop speaking for 3s, or click stop." : "Click the mic to start recording."}
            </div>
        )}
      </div>
      
       {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <button
        onClick={handleRecordToggle}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-lg transition-colors text-white ${
          isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'
        }`}
        disabled={isLoading}
      >
        {isRecording ? <StopIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
        <span>{isRecording ? 'Stop Recording' : 'Pronounce Word'}</span>
      </button>
    </div>
  );
};

export default PronunciationCard;
