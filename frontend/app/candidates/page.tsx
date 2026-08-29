// app/candidates/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { AdminCandidates } from '@/components/admin/AdminCandidates';
import { VoterCandidates } from '@/components/voter/VoterCandidates';

export default async function CandidatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const isAdmin = user.role === 'ELECTION_OFFICER' || user.role === 'ADMINISTRATOR';
  return isAdmin ? <AdminCandidates user={user} /> : <VoterCandidates user={user} />;
}