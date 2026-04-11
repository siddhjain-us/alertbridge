export interface DispatchUser {
  phone: string;
  language: string;
}

export interface DispatchList {
  alertId: string;
  alertText: string;
  event: string;
  severity: string;
  affectedZips: string[];
  users: DispatchUser[];
  createdAt: string;
}
