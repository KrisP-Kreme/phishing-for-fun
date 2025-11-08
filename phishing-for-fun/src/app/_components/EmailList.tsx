'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { api } from '@/trpc/client';

interface EmailListProps {
  domain: string;
  description?: string;
  onNext: (emails: string[]) => void;
  onBack: () => void;
}

export function EmailList({ domain, description, onNext, onBack }: EmailListProps) {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  
  const { data, isLoading, error } = api.scraper.scrapeEmails.useMutation();
  
  const handleEmailToggle = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Select Target Emails</CardTitle>
        <CardDescription>
          Found {data?.emails.length || 0} email addresses on {domain}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <div>Scraping emails...</div>}
        {error && <div className="text-red-500">Error: {String((error as any)?.message)}</div>}
        
        {data?.emails.map((email) => (
          <div key={email} className="flex items-center space-x-2">
            <Checkbox
              id={email}
              checked={selectedEmails.includes(email)}
              onCheckedChange={() => handleEmailToggle(email)}
            />
            <label htmlFor={email} className="text-sm font-medium">
              {email}
            </label>
          </div>
        ))}
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button
            onClick={() => onNext(selectedEmails)}
            disabled={selectedEmails.length === 0}
          >
            Next: Generate Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
