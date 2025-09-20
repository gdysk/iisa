export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  country: string;
  countryCode: string;
  hobbies?: string;
  why?: string;
  imageDataUrl?: string;
  createdAt: string;
  updatedAt?: string;
}
