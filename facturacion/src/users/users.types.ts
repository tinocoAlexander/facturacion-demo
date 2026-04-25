export interface User {
  id:            number;
  email:         string;
  password_hash: string;
  full_name:     string;
  role:          'user' | 'admin';
  is_active:     boolean;
  last_login_at: Date | null;
  created_at:    Date;
  updated_at:    Date;
}

export type PublicUser = Omit<User, 'password_hash'>;