import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface HoldToDeleteButtonProps {
  onDelete: () => void;
  className?: string;
  holdDuration?: number;
  children?: React.ReactNode;
}

const HoldToDeleteButton: React.FC<HoldToDeleteButtonProps> = ({
  onDelete,
  className,
  holdDuration = 1500,
  children
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);

  const startHolding = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsHolding(true);
    
    timerRef.current = window.setTimeout(() => {
      onDelete();
      reset();
    }, holdDuration);
    
    let startTime = Date.now();
    progressRef.current = window.setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const newProgress = Math.min((elapsedTime / holdDuration) * 100, 100);
      setProgress(newProgress);
    }, 20);
  };

  const reset = () => {
    setIsHolding(false);
    setProgress(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
    }
  };
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    }
  }, []);


  const defaultClassName = "p-2 bg-red-50 text-red-400 rounded-lg hover:text-red-600 hover:bg-red-100 relative overflow-hidden select-none transition-colors";

  return (
    <button
      onMouseDown={startHolding}
      onTouchStart={startHolding}
      onMouseUp={reset}
      onMouseLeave={reset}
      onTouchEnd={reset}
      className={className || defaultClassName}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children || <Trash2 size={18} />}
      </span>
      {isHolding && (
        <div 
          className="absolute inset-0 bg-red-500/50 origin-left z-0"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      )}
    </button>
  );
};

export default HoldToDeleteButton;