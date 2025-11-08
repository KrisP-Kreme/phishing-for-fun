import React from 'react';

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="w-full rounded-md border px-3 py-2" {...props} />;
}

export default Textarea;
