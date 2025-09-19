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
        className="w-24 h-24 bg-slate-800 text-white text-center text-4xl rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        min="0"
        max={max}
        aria-label={`Set ${label}`}
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
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
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

const PREDEFINED_SOUNDS = [
  { name: 'Alarm Clock', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
  { name: 'Bell Timer', url: 'https://actions.google.com/sounds/v1/alarms/bell_timer.ogg' },
  { name: 'Digital Watch', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { name: 'Notification', url: 'https://actions.google.com/sounds/v1/notifications/positive_notification.ogg' },
];

const HISTORY_STORAGE_KEY = 'sleek-timer-history';
const MAX_HISTORY_ITEMS = 5;

type TimeObject = { days: number; hours: number; minutes: number; seconds: number; };

const App: React.FC = () => {
  const [time, setTime] = useState<TimeObject>({ days: 0, hours: 0, minutes: 1, seconds: 30 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [initialTotalSeconds, setInitialTotalSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [selectedSound, setSelectedSound] = useState<string>(PREDEFINED_SOUNDS[0].url);
  const [customSoundName, setCustomSoundName] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [history, setHistory] = useState<TimeObject[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history from localStorage on initial mount
  useEffect(() => {
    try {
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage:", error);
    }
  }, []);

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
            audioRef.current?.play().catch(error => console.error("Audio playback failed:", error));
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
      // Add current time to history
      setHistory(prevHistory => {
        const newEntry = { ...time };
        // Filter out the current time if it already exists to move it to the front
        const filteredHistory = prevHistory.filter(
            item =>
                !(item.days === newEntry.days &&
                item.hours === newEntry.hours &&
                item.minutes === newEntry.minutes &&
                item.seconds === newEntry.seconds)
        );
        const newHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
        try {
            window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
        } catch (error) {
            console.error("Failed to save history to localStorage:", error);
        }
        return newHistory;
      });

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleSoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSound(e.target.value);
    if (PREDEFINED_SOUNDS.some(s => s.url === e.target.value)) {
      setCustomSoundName(null);
    }
  };

  const handleCustomSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        alert('Please upload a valid audio file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setCustomSoundName(file.name);
          setSelectedSound(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHistorySelect = (selectedTime: TimeObject) => {
    setTime(selectedTime);
    setIsHistoryOpen(false);
  };

  const formatHistoryItem = (item: TimeObject) => {
    const parts = [];
    if (item.days > 0) parts.push(`${item.days}d`);
    if (item.hours > 0) parts.push(`${item.hours}h`);
    if (item.minutes > 0) parts.push(`${item.minutes}m`);
    if (item.seconds > 0) parts.push(`${item.seconds}s`);
    return parts.length > 0 ? parts.join(' ') : "0s";
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

    const daysForProgress = totalSeconds / 86400;
    const hoursForProgress = (totalSeconds % 86400) / 3600;
    const minutesForProgress = (totalSeconds % 3600) / 60;
    const secondsForProgress = totalSeconds % 60;
    
    const initialTotalDays = initialTotalSeconds / 86400;
    const daysPercentage = initialTotalDays > 0 ? (daysForProgress / initialTotalDays) * 100 : 0;
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
      <audio ref={audioRef} src={selectedSound} preload="auto" />
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
          <div>
            <div className="flex justify-center items-start space-x-2 md:space-x-4">
              <TimeUnitInput label="Days" value={time.days} onChange={v => handleTimeChange('days', v)} max={99} disabled={isActive} />
              <TimeUnitInput label="Hours" value={time.hours} onChange={v => handleTimeChange('hours', v)} max={23} disabled={isActive} />
              <TimeUnitInput label="Minutes" value={time.minutes} onChange={v => handleTimeChange('minutes', v)} max={59} disabled={isActive} />
              <TimeUnitInput label="Seconds" value={time.seconds} onChange={v => handleTimeChange('seconds', v)} max={59} disabled={isActive} />
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-700">
              <label htmlFor="sound-select" className="block mb-3 text-sm font-medium text-slate-400 uppercase tracking-wider text-center">
                Alert Sound
              </label>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <select
                  id="sound-select"
                  value={selectedSound}
                  onChange={handleSoundChange}
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:w-auto p-2.5"
                >
                  {PREDEFINED_SOUNDS.map(sound => (
                    <option key={sound.name} value={sound.url}>{sound.name}</option>
                  ))}
                  {customSoundName && <option value={selectedSound}>{customSoundName}</option>}
                </select>
                <label className="cursor-pointer px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors">
                  Upload Custom
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleCustomSoundUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
                <button
                onClick={() => setIsHistoryOpen(prev => !prev)}
                className="flex items-center justify-center w-full gap-2 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 rounded-md p-2"
                aria-expanded={isHistoryOpen}
                aria-controls="history-panel"
                >
                <span className="text-sm font-medium uppercase tracking-wider">Recent Timers</span>
                <svg
                    className={`w-5 h-5 transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                    />
                </svg>
                </button>
                {isHistoryOpen && (
                <div
                    id="history-panel"
                    className="mt-3 max-h-40 overflow-y-auto bg-slate-900/70 rounded-lg p-2 space-y-1 animate-pop-in" // Simple pop-in animation
                >
                    {history.length > 0 ? (
                    history.map((item, index) => (
                        <button
                        key={index}
                        onClick={() => handleHistorySelect(item)}
                        className="w-full text-center p-2.5 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:bg-slate-700"
                        aria-label={`Set timer to ${formatHistoryItem(item)}`}
                        >
                        {formatHistoryItem(item)}
                        </button>
                    ))
                    ) : (
                    <p className="text-slate-500 p-2 text-center text-sm">No recent timers.</p>
                    )}
                </div>
                )}
            </div>
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
