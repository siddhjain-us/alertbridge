export interface Alert {
  id: string;
  event: string;
  severity: string;
  onset: string;
  expires: string;
  areaDesc: string;
  description: string;
  fipsCodes: string[];
  fetchedAt: string;
}
