import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// --- HELPER COMPONENTS (defined outside App to prevent re-creation on re-renders) ---

interface TimeUnitInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
  disabled: boolean;
}

const TimeUnitInput: React.FC<TimeUnitInputProps> = ({ label, value, onChange, max, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let num = parseInt(e.target.value, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    onChange(num);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <input
        type="number"
        value={String(value).padStart(2, '0')}
        onChange={handleChange}
        disabled={disabled}
        className="w-24 h-24 bg-slate-800 text-white text-center text-4xl rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        min="0"
        max={max}
        aria-label={`Set ${label}`}
      />
      <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{label}</label>
    </div>
  );
};


interface CircularProgressProps {
    progress: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ progress }) => {
    const size = 280;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            <circle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={strokeWidth}
                className="text-slate-700"
                fill="transparent"
                stroke="currentColor"
            />
            <circle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={strokeWidth}
                className="text-yellow-500"
                fill="transparent"
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
        </svg>
    );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  const [initialTime, setInitialTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create a new worker
    const code = `
      let timerId = null;
      self.onmessage = (e) => {
        if (e.data.command === 'start') {
          if(timerId) clearInterval(timerId);
          timerId = setInterval(() => {
            self.postMessage('tick');
          }, 1000);
        } else if (e.data.command === 'stop') {
          clearInterval(timerId);
          timerId = null;
        }
      };
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    // Set up message handler
    workerRef.current.onmessage = () => {
      setTimeLeft(prev => prev - 1);
    };
    
    // Cleanup
    return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(workerUrl);
    };
  }, []);

  useEffect(() => {
    if (isActive && timeLeft <= 0) {
      setIsActive(false);
      setIsFinished(true);
      workerRef.current?.postMessage({ command: 'stop' });
      // Vibrate for 200ms when the timer finishes
      if (navigator.vibrate) {
          navigator.vibrate(200);
      }
    }
  }, [timeLeft, isActive]);

  const handleStart = useCallback(() => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds > 0) {
      setInitialTime(totalSeconds);
      setTimeLeft(totalSeconds);
      setIsActive(true);
      setIsFinished(false);
      workerRef.current?.postMessage({ command: 'start' });
    }
  }, [hours, minutes, seconds]);

  const handlePause = useCallback(() => {
    setIsActive(false);
    workerRef.current?.postMessage({ command: 'stop' });
  }, []);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    workerRef.current?.postMessage({ command: 'stop' });
    setHours(0);
    setMinutes(5);
    setSeconds(0);
    setTimeLeft(0);
    setInitialTime(0);
  }, []);

  const progress = useMemo(() => {
    if (initialTime === 0) return 0;
    return (timeLeft / initialTime) * 100;
  }, [timeLeft, initialTime]);

  const formatTime = (time: number) => {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = time % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isTimerRunningOrFinished = isActive || isFinished;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <main className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-yellow-400">Countdown Timer</h1>

        <div className="relative w-72 h-72 flex items-center justify-center mb-8">
            <CircularProgress progress={progress} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isFinished ? (
                     <span className="text-5xl font-bold text-yellow-500 animate-pop-in" role="alert">Time's Up!</span>
                ) : (
                     <span className="text-6xl font-mono font-bold" aria-live="polite">{formatTime(timeLeft)}</span>
                )}
            </div>
        </div>

        {/* --- Time Inputs --- */}
        {!isTimerRunningOrFinished && (
            <div className="flex items-center justify-center space-x-4 mb-8" role="group" aria-label="Set countdown duration">
                 <TimeUnitInput label="Hours" value={hours} onChange={setHours} max={23} disabled={isActive} />
                 <TimeUnitInput label="Minutes" value={minutes} onChange={setMinutes} max={59} disabled={isActive} />
                 <TimeUnitInput label="Seconds" value={seconds} onChange={setSeconds} max={59} disabled={isActive} />
            </div>
        )}

        {/* --- Controls --- */}
        <div className="flex items-center space-x-4">
            {!isActive ? (
                <button
                    onClick={handleStart}
                    disabled={isTimerRunningOrFinished && !isFinished}
                    className="px-8 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-full shadow-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
                    aria-label="Start timer"
                >
                    Start
                </button>
            ) : (
                <button
                    onClick={handlePause}
                    className="px-8 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-full shadow-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-yellow-500 transition-all text-lg"
                    aria-label="Pause timer"
                >
                    Pause
                </button>
            )}
            <button
                onClick={handleReset}
                className="px-8 py-3 bg-slate-700 text-white font-semibold rounded-full shadow-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white transition-all text-lg"
                aria-label="Reset timer"
            >
                Reset
            </button>
        </div>
      </main>
    </div>
  );
};

export default App;
