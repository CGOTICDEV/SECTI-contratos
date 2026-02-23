export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoBase64?: string;
  role?: string;
  createdAt?: string | number | Date;
  // additional optional fields for future expansion
  phone?: string;
  department?: string;
}
