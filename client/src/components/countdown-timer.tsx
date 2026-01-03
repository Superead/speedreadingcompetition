import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date | string | null;
  onComplete?: () => void;
  className?: string;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const difference = targetDate.getTime() - Date.now();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function CountdownTimer({
  targetDate,
  onComplete,
  className = "",
  showLabels = true,
  size = "md",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!targetDate) return;

    const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
    
    const updateTimer = () => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.total <= 0 && onComplete) {
        onComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!targetDate) {
    return <span className="text-muted-foreground">Not scheduled</span>;
  }

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const labelClasses = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  };

  const padNumber = (num: number) => String(num).padStart(2, "0");

  if (timeLeft.total <= 0) {
    return <span className={`font-bold text-green-600 dark:text-green-400 ${sizeClasses[size]} ${className}`}>Started!</span>;
  }

  return (
    <div className={`font-mono tabular-nums flex gap-1 items-baseline ${className}`}>
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <span className={`font-bold ${sizeClasses[size]}`}>{timeLeft.days}</span>
          {showLabels && <span className={`text-muted-foreground ${labelClasses[size]}`}>days</span>}
        </div>
      )}
      {timeLeft.days > 0 && <span className={`${sizeClasses[size]} text-muted-foreground`}>:</span>}
      <div className="flex flex-col items-center">
        <span className={`font-bold ${sizeClasses[size]}`}>{padNumber(timeLeft.hours)}</span>
        {showLabels && <span className={`text-muted-foreground ${labelClasses[size]}`}>hrs</span>}
      </div>
      <span className={`${sizeClasses[size]} text-muted-foreground`}>:</span>
      <div className="flex flex-col items-center">
        <span className={`font-bold ${sizeClasses[size]}`}>{padNumber(timeLeft.minutes)}</span>
        {showLabels && <span className={`text-muted-foreground ${labelClasses[size]}`}>min</span>}
      </div>
      <span className={`${sizeClasses[size]} text-muted-foreground`}>:</span>
      <div className="flex flex-col items-center">
        <span className={`font-bold ${sizeClasses[size]}`}>{padNumber(timeLeft.seconds)}</span>
        {showLabels && <span className={`text-muted-foreground ${labelClasses[size]}`}>sec</span>}
      </div>
    </div>
  );
}

export function DurationTimer({
  startTime,
  durationMinutes,
  onComplete,
  className = "",
  size = "md",
}: {
  startTime: Date | string;
  durationMinutes: number;
  onComplete?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const endTime = new Date(start.getTime() + durationMinutes * 60 * 1000);
  
  return (
    <CountdownTimer
      targetDate={endTime}
      onComplete={onComplete}
      className={className}
      showLabels={false}
      size={size}
    />
  );
}
