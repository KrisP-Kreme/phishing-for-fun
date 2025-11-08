'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface EmailPreviewProps {
  email: any;
  onBack: () => void;
  onReset: () => void;
}

export function EmailPreview({ email, onBack, onReset }: EmailPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Email Preview</CardTitle>
        <CardDescription>
          Review and edit your generated email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            defaultValue={email?.subject}
            className="font-medium"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="body">Email Body</Label>
          <Textarea
            id="body"
            defaultValue={email?.body}
            rows={12}
            className="font-mono text-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button variant="outline" onClick={onReset}>Start Over</Button>
          <Button className="ml-auto">Send Email</Button>
        </div>
      </CardContent>
    </Card>
  );
}
