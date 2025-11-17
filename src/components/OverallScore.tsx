import React from 'react';
import { ScoreCircle } from './ScoreCircle';

interface OverallScoreProps {
  score: number;
}

const OverallScore: React.FC<OverallScoreProps> = ({ score }) => {
  return (
    <div className="mt-10 mb-6 p-8 bg-slate-800 rounded-2xl border border-cyan-500 shadow-lg text-center animate-fade-in w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
        Practice Complete!
      </h2>
      <p className="text-slate-300 mb-6">Here's your overall pronunciation score:</p>
      <div className="flex justify-center">
        <ScoreCircle score={score} />
      </div>
    </div>
  );
};

export default OverallScore;
