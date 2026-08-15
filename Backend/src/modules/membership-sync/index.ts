// Minimal barrel — exports only what other modules/the app entrypoint
// should touch. No service or repository export: nothing outside this
// module should call runMembershipSync or the Prisma-facing functions
// directly, same discipline as auth's and users' index.ts files.

export { membershipSyncRoutes } from './membership-sync.routes';