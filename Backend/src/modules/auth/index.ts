/**
 * Auth Module — Barrel Export
 *
 * What src/routes/ (or app.ts) imports to mount this module — e.g.
 * app.use('/api/v1/auth', authRoutes). Deliberately minimal: other
 * modules should never reach into auth.service.ts, auth.repository.ts,
 * or auth.types.ts directly. If a future module genuinely needs
 * something from auth (e.g. issueTokenPair for a password-reset flow
 * elsewhere), it gets added here as a deliberate export, not accessed
 * by poking through this module's internal files.
 */
export { default as authRoutes } from './auth.routes';
export { authenticate } from './auth.middleware';