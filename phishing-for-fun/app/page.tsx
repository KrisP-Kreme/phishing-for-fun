 'use client';

 import { useState } from 'react';
 import { DomainInput } from './_components/DomainInput';
 import { EmailList } from './_components/EmailList';
 import { EmailGenerator } from './_components/EmailGenerator';
 import { EmailPreview } from './_components/EmailPreview';
 import { Progress } from '@/components/ui/progress';

 export default function Home() {
   const [step, setStep] = useState(1);
   const [workflowData, setWorkflowData] = useState<any>({});

   const updateWorkflowData = (data: any) => {
     setWorkflowData({ ...workflowData, ...data });
   };

   const progress = (step / 4) * 100;

   return (
     <main className="container mx-auto p-8 max-w-4xl">
       <h1 className="text-4xl font-bold mb-8 text-center">Email Outreach Assistant</h1>

       <Progress value={progress} className="mb-8" />

       {step === 1 && (
         <DomainInput
           onNext={(data) => {
             updateWorkflowData(data);
             setStep(2);
           }}
         />
       )}

       {step === 2 && (
         <EmailList
           domain={workflowData.domain}
           description={workflowData.description}
           onNext={(emails) => {
             updateWorkflowData({ selectedEmails: emails });
             setStep(3);
           }}
           onBack={() => setStep(1)}
         />
       )}

       {step === 3 && (
         <EmailGenerator
           data={workflowData}
           onNext={(generatedEmail) => {
             updateWorkflowData({ generatedEmail });
             setStep(4);
           }}
           onBack={() => setStep(2)}
         />
       )}

       {step === 4 && (
         <EmailPreview
           email={workflowData.generatedEmail}
           onBack={() => setStep(3)}
           onReset={() => {
             setStep(1);
             setWorkflowData({});
           }}
         />
       )}
     </main>
   );
 }
