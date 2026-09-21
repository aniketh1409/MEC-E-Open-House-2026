export interface Booth {
  id: string;
  name: string;
  shortDescription: string;
  locationId: string;
  stampId: string;
  qrCode: string;
  category: string;
  isActive: boolean;
}

export interface Location {
  id: string;
  building: string;
  floor: number;
  room: string;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface Stamp {
  id: string;
  name: string;
  description: string;
  image: string;
  boothId: string;
}

export interface VisitorPassportState {
  passportId: string;
  collectedStamps: string[];
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
