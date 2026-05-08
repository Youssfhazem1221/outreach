// Shared Lead types used across the entire CRM

export type LeadStatus = "New" | "Contacted" | "Replied" | "Call Booked" | "Closed" | "Not Interested";

export interface LabelRecord {
  id: string;
  name: string;
  color: string;
}

export interface FirebaseTimestamp {
  toMillis: () => number;
  seconds?: number;
  nanoseconds?: number;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  websiteLabel?: string;
  address?: string;
  city?: string;
  country?: string;
  niche?: string;
  decisionMaker?: string;
  decisionMakerTitle?: string;
  status: LeadStatus;
  source?: string;
  rating?: number;
  pain?: string;
  labels?: LabelRecord[];
  history?: any[];
  userId: string;
  userEmail?: string;
  userName?: string;
  channel?: string;
  createdAt?: FirebaseTimestamp | null;
  updatedAt?: FirebaseTimestamp | null;
  tempId?: string;
  alreadyInCRM?: boolean;
  [key: string]: any;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  params: {
    query: string;
    location: string;
    country: string;
    scope: string;
    offer: string;
    count: number;
    selectedLabelId: string;
  };
  createdAt?: FirebaseTimestamp | null;
}

export interface SearchMeta {
  totalRawResults: number;
  passesCompleted: number;
  [key: string]: unknown;
}
