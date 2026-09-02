import type { UserRole, Member } from "../../types/member";

export const mockUsers: Member[] = [
  {
    id: "usr-admin-001",
    name: "Admin User",
    email: "admin.user@sacco.co.ke",
    role: "ADMINISTRATOR",
    branch: "Head Office",
    mfaEnabled: true,
    isOnline: true, // matches "Admin User • Online" in screenshot
    avatarUrl: "/mock/avatars/admin-001.jpg",
    createdAt: "2024-01-10T08:00:00Z",
  },
  {
    id: "usr-officer-002",
    name: "Winnie Chebet",
    email: "w.chebet@sacco.co.ke",
    role: "ELECTION_OFFICER",
    branch: "Nairobi",
    mfaEnabled: true,
    isOnline: false,
    avatarUrl: "/mock/avatars/officer-002.jpg",
    createdAt: "2024-03-02T08:00:00Z",
  },
  {
    id: "usr-auditor-003",
    name: "Kevin Mutua",
    email: "k.mutua@sacco.co.ke",
    role: "AUDITOR",
    branch: "Head Office",
    mfaEnabled: true,
    isOnline: false,
    avatarUrl: "/mock/avatars/auditor-003.jpg",
    createdAt: "2024-02-14T08:00:00Z",
  },
  {
    id: "usr-member-004",
    name: "Grace Wanjiru",
    email: "grace.wanjiru@members.sacco.co.ke",
    membershipNumber: "SCCO-00456",
    role: "MEMBER",
    branch: "Nairobi",
    mfaEnabled: false,
    isOnline: false,
    avatarUrl: "/mock/avatars/candidate-021.jpg",
    createdAt: "2022-06-01T08:00:00Z",
  },
  {
    id: "usr-member-005",
    name: "Peter Otieno",
    email: "peter.otieno@members.sacco.co.ke",
    membershipNumber: "SCCO-00892",
    role: "MEMBER",
    branch: "Kisumu",
    mfaEnabled: true,
    isOnline: false,
    avatarUrl: "/mock/avatars/candidate-022.jpg",
    createdAt: "2021-11-20T08:00:00Z",
  },
];

/**
 * Generates additional lightweight member records for table/pagination testing
 * (e.g. Users page, Verification queue) without hand-writing all 1,248 rows.
 */
export function generateMockMembers(count: number): Member[] {
  const branches = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];
  const firstNames = ["John", "Mary", "Samuel", "Faith", "Brian", "Esther", "Collins", "Ruth"];
  const lastNames = ["Kamau", "Odhiambo", "Wafula", "Chepkoech", "Njoroge", "Kariuki", "Mutiso"];

  return Array.from({ length: count }, (_, i) => {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[(i * 3) % lastNames.length];
    const branch = branches[i % branches.length];
    const membershipNumber = `SCCO-${(2000 + i).toString().padStart(5, "0")}`;
    return {
      id: `usr-member-gen-${i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@members.sacco.co.ke`,
      membershipNumber,
      role: "MEMBER" as UserRole,
      branch,
      mfaEnabled: i % 4 === 0,
      isOnline: false,
      avatarUrl: `/mock/avatars/placeholder.jpg`,
      createdAt: "2023-01-01T08:00:00Z",
    };
  });
}

export const mockRegisteredMembersCount = 1248; // matches dashboard "Registered Members" card

export function getMemberById(id: string): Member | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getMembersByRole(role: UserRole): Member[] {
  return mockUsers.filter((u) => u.role === role);
}

export function searchMembers(query: string, role?: UserRole, status?: MemberStatus): Member[] {
  const q = query.trim().toLowerCase();
  return mockUsers.filter((m) => {
    const matchesQuery = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchesRole = !role || m.role === role;
    const matchesStatus = !status || (m.status ?? "ACTIVE") === status;
    return matchesQuery && matchesRole && matchesStatus;
  });
}