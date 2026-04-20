import 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * Attached by the `authenticate` middleware after successful JWT verification.
       */
      user?: {
        id: string;
        role: string;
        jti: string;
      };
    }
  }
}
