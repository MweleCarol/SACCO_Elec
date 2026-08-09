import rateLimit from 'express-rate-limit';
import {ERROR_CODES} from '@shared/constants/error-codes.constants'

export function createRateLimiter(windowMinutes: number, max: number, message: string) {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    max,
    message: { success: false, message, errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED },
    standardHeaders: true,
    legacyHeaders: false,
  });
}