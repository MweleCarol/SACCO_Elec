import type { Member } from '@/types/member';

export function AdminCandidates({ user }: { user: Member }) {
  return <div>Admin candidates view — welcome, {user.name}</div>;
}