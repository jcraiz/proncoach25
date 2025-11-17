import React from 'react';

interface ScoreCircleProps {
    score: number;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({ score }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 85) return 'stroke-green-400';
        if (s >= 60) return 'stroke-yellow-400';
        return 'stroke-red-400';
    };

    return (
        <div className="relative flex items-center justify-center w-20 h-20">
            <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                    className="stroke-slate-700"
                    strokeWidth="5"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                />
                <circle
                    className={`transition-all duration-1000 ease-out ${getColor(score)}`}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                />
            </svg>
            <span className={`text-xl font-bold ${getColor(score).replace('stroke-', 'text-')}`}>{score}</span>
        </div>
    );
};
