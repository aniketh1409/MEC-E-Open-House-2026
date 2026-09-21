export interface Booth {
  id: string;
  name: string;
  description: string;
  buildingId: string;
  room?: string;
  latitude?: number;
  longitude?: number;
  stampImage: string;
}

export interface Building {
  id: string;
  abbreviation: string;
  name: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
}
