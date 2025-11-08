export interface Email {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: Date;
}

export interface ScrapedData {
  domain: string;
  emails: string[];
  description?: string;
  scrapedAt: Date;
}

export interface WorkflowData {
  domain: string;
  description?: string;
  selectedEmails: string[];
  generatedEmail?: {
    subject: string;
    body: string;
  };
}
