/**
 * Users Module — Barrel Export
 *
 * Minimal by design, same rationale as auth's index.ts: other modules
 * should reach User data through this module's public surface, not by
 * importing users.repository.ts or users.service.ts directly. Nothing
 * beyond the router is needed yet — if M8/M9 eventually need something
 * from here (e.g. a user summary lookup), it gets added as a
 * deliberate export then, not accessed by poking through internals.
 */
export { default as usersRoutes } from './users.routes';