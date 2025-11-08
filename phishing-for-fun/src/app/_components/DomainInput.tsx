'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DomainInputProps {
  onNext: (data: { domain: string; description: string }) => void;
}

export function DomainInput({ onNext }: DomainInputProps) {
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ domain, description });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Enter Domain Information</CardTitle>
        <CardDescription>
          Enter the domain you want to scrape for email addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain URL</Label>
            <Input
              id="domain"
              type="url"
              placeholder="https://example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose of your outreach..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          
          <Button type="submit" disabled={!domain}>
            Next: Scrape Emails
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
