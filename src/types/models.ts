// User Model
export interface User {
  id: string;
  email: string;
  userName?: string;
  role: string[];
  avatarUrl?: string;
}

// Decoded JWT Token
export interface DecodedToken extends User {
  nbf?: number;
  exp?: number;
  iat?: number;
}
