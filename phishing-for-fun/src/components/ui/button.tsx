import React from 'react';

export function Button({ className = '', variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string, className?: string }) {
  const base = 'inline-flex items-center px-4 py-2 rounded-md bg-black text-white hover:opacity-90 disabled:opacity-50';
  return <button className={`${base} ${className}`} {...props} />;
}

export default Button;
