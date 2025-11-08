'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from '@/trpc/client';

interface EmailGeneratorProps {
  data: any;
  onNext: (email: any) => void;
  onBack: () => void;
}

export function EmailGenerator({ data, onNext, onBack }: EmailGeneratorProps) {
  const [tone, setTone] = useState<'professional' | 'casual' | 'friendly'>('professional');
  
  const generateEmail = api.llm.generateEmail.useMutation({
    onSuccess: (generatedEmail: any) => {
      onNext(generatedEmail);
    },
  });

  const handleGenerate = () => {
    generateEmail.mutate({
      targetEmail: data.selectedEmails[0],
      domain: data.domain,
      description: data.description || '',
      tone,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Generate Email</CardTitle>
        <CardDescription>
          Configure and generate your outreach email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Target Email</Label>
          <div className="text-sm text-muted-foreground">
            {data.selectedEmails.join(', ')}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tone">Email Tone</Label>
          <Select value={tone} onValueChange={(value: any) => setTone(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button
            onClick={handleGenerate}
            disabled={(generateEmail as any).isLoading}
          >
            {(generateEmail as any).isLoading ? 'Generating...' : 'Generate Email'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
