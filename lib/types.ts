export type CandidateStatus = "Under Review" | "Selected" | "Rejected";
export type OfferStatus = "Pending" | "Accepted" | "Rejected";

export interface CandidateRecord {
  sNo: number;
  candidateName: string;
  email: string;
  contactNumber: string;
  roleAppliedFor: string;
  yearsOfExperience: string;
  currentCtc: string;
  expectedCtc: string;
  noticePeriod: string;
  notes: string;
  reasonForLeaving?: string;
  interviewSchedule?: string;
  status?: CandidateStatus | string;
  offerStatus?: OfferStatus | string;
  addedTimestamp: string;
  fileName?: string;
}

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  previewUrl?: string;
}
