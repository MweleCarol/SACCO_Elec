import { CopilotShortcut } from "@/components/ai/CopilotShortcut";

// Kept so the results page does not change yet; it now opens the real
// Copilot page. (The staff results page is rebuilt in the officer results stage.)
export function CopilotTeaserCard({ description }: { description: string; greeting?: string; suggestedQuestions?: string[] }) {
  return <CopilotShortcut description={description} />;
}