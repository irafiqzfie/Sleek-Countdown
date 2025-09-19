import React, { useState, useEffect, useMemo, useCallback } from 'react';

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
        className="w-24 h-24 bg-slate-800 text-white text-center text-4xl rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        min="0"
        max={max}
      />
      <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">{label}</label>
    </div>
  );
};

interface CircularProgressProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  label: string;
  value: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ percentage, size, strokeWidth, label, value }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="text-slate-700/50"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-cyan-500"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.35s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold text-white tabular-nums">{String(value).padStart(2, '0')}</span>
        <span className="text-lg text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 1, seconds: 30 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [initialTotalSeconds, setInitialTotalSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const handleTimeChange = useCallback((unit: keyof typeof time, value: number) => {
    setTime(prev => ({ ...prev, [unit]: value }));
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setTotalSeconds((prevSeconds) => {
          if (prevSeconds <= 1) {
            clearInterval(interval!);
            setIsActive(false);
            setIsFinished(true);
            return 0;
          }
          return prevSeconds - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, isPaused]);

  const handleStart = () => {
    const seconds = time.days * 86400 + time.hours * 3600 + time.minutes * 60 + time.seconds;
    if (seconds > 0) {
      setTotalSeconds(seconds);
      setInitialTotalSeconds(seconds);
      setIsActive(true);
      setIsPaused(false);
      setIsFinished(false);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setIsFinished(false);
    setTotalSeconds(0);
    setInitialTotalSeconds(0);
    // Optional: Reset time inputs to a default
    // setTime({ days: 0, hours: 0, minutes: 1, seconds: 30 });
  };

  const timeLeft = useMemo(() => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }, [totalSeconds]);

  const progress = useMemo(() => {
    if (initialTotalSeconds <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    // These values represent the smoothly decreasing time in each unit.
    // e.g., minutesForProgress will be 29.5 when 29 minutes and 30 seconds are left in the current hour.
    const daysForProgress = totalSeconds / 86400;
    const hoursForProgress = (totalSeconds % 86400) / 3600;
    const minutesForProgress = (totalSeconds % 3600) / 60;
    const secondsForProgress = totalSeconds % 60;

    // For the days circle, the progress is relative to the total initial duration.
    // This makes it an overall progress indicator.
    const initialTotalDays = initialTotalSeconds / 86400;
    const daysPercentage = initialTotalDays > 0 ? (daysForProgress / initialTotalDays) * 100 : 0;

    // For smaller units, progress is relative to their containing unit (e.g., hours out of 24, minutes out of 60).
    // This creates a familiar "clock-like" feel where the hands move smoothly.
    const hoursPercentage = (hoursForProgress / 24) * 100;
    const minutesPercentage = (minutesForProgress / 60) * 100;
    const secondsPercentage = (secondsForProgress / 60) * 100;

    return {
      days: daysPercentage,
      hours: hoursPercentage,
      minutes: minutesPercentage,
      seconds: secondsPercentage,
    };
  }, [totalSeconds, initialTotalSeconds]);

  const canStart = useMemo(() => {
    return time.days > 0 || time.hours > 0 || time.minutes > 0 || time.seconds > 0;
  }, [time]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Sleek Countdown Timer</h1>
        <p className="text-slate-400 mt-2">Set a duration and watch the time fly.</p>
      </header>
      
      <main className="w-full max-w-4xl bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-10 border border-slate-700">
        {isFinished && (
          <div className="text-center py-16 animate-pop-in">
            <h2 className="text-5xl font-extrabold text-cyan-400">Time's Up!</h2>
          </div>
        )}
        {!isActive && !isFinished && (
          <div className="flex justify-center items-start space-x-2 md:space-x-4">
            <TimeUnitInput label="Days" value={time.days} onChange={v => handleTimeChange('days', v)} max={99} disabled={isActive} />
            <TimeUnitInput label="Hours" value={time.hours} onChange={v => handleTimeChange('hours', v)} max={23} disabled={isActive} />
            <TimeUnitInput label="Minutes" value={time.minutes} onChange={v => handleTimeChange('minutes', v)} max={59} disabled={isActive} />
            <TimeUnitInput label="Seconds" value={time.seconds} onChange={v => handleTimeChange('seconds', v)} max={59} disabled={isActive} />
          </div>
        )}
        {isActive && (
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
            {initialTotalSeconds >= 86400 && (
              <CircularProgress percentage={progress.days} size={150} strokeWidth={10} label="Days" value={timeLeft.days} />
            )}
            {initialTotalSeconds >= 3600 && (
               <CircularProgress percentage={progress.hours} size={150} strokeWidth={10} label="Hours" value={timeLeft.hours} />
            )}
            {initialTotalSeconds >= 60 && (
              <CircularProgress percentage={progress.minutes} size={150} strokeWidth={10} label="Minutes" value={timeLeft.minutes} />
            )}
            {/* Always show seconds if timer is active */}
            <CircularProgress percentage={progress.seconds} size={150} strokeWidth={10} label="Seconds" value={timeLeft.seconds} />
          </div>
        )}
        
        <div className="mt-10 flex items-center justify-center space-x-4">
          {!isActive && (
            <button 
              onClick={handleStart} 
              disabled={!canStart}
              className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-full hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-all disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start
            </button>
          )}
          {isActive && (
            <>
              <button 
                onClick={handlePauseResume} 
                className="px-8 py-3 bg-yellow-500 text-white font-bold rounded-full hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-yellow-500 transition-all"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button 
                onClick={handleReset} 
                className="px-8 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-all"
              >
                Reset
              </button>
            </>
          )}
          {isFinished && (
             <button 
                onClick={handleReset} 
                className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-full hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-all animate-pulse"
              >
                Start Over
              </button>
          )}
        </div>
      </main>

      <footer className="mt-10 text-center text-slate-500 text-sm">
        <p>Built with React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
