type validateErrorTypes =
  | 'JWT_PAYLOAD_ERROR'
  | 'JWS_SIGNATURE_VERIFICATION_FAILED'
  | 'JWS_INVALID'
  | 'JWT_EXPIRED'
  | 'JWT_INVALID'
  | 'JWT_REVOKED'
  | 'UNKNOWN_ERROR';

export class TokenValidteError extends Error {
  public code: validateErrorTypes;
  constructor(code: validateErrorTypes) {
    super(code);
    this.name = 'TokenValidteError';
    this.code = code;
  }
}
