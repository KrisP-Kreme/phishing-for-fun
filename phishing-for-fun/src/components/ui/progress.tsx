import React from 'react';

export function Progress({ value = 0, className = '' }: { value?: number; className?: string }) {
  return (
    <div className={`w-full bg-gray-200 h-2 rounded ${className}`}>
      <div className="bg-black h-2 rounded" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export default Progress;
