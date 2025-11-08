import React from 'react';

export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium">{children}</label>;
}

export default Label;
