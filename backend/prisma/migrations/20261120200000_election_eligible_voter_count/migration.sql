-- How many members were eligible to vote when voting closed: members whose
-- SACCO membership was ACTIVE (the same rule the ballot uses). Saved once at
-- close so published turnout does not drift as memberships change later.
-- Elections closed before this column existed stay NULL (turnout unknown).
ALTER TABLE "Election" ADD COLUMN "eligibleVoterCount" INTEGER;