export interface User {
  uid?: string;
  role?: Role;
  email?: string;
  cellphone?: string;
  photoURL?: string;
  displayName?: string;
  paypalEmail?: string;
  disabled?: boolean;
}

export type Role = 'user';
