import type { Member } from '@/types/member';

export function VoterCandidates({ user }: { user: Member }) {
  return <div>Voter candidates view — welcome, {user.name}</div>;
}