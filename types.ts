export interface City {
  name: string;
  lat: number;
  lng: number;
  isCenter?: boolean;
}

export interface TravelTimeData {
  [cityName: string]: number; // Duration in minutes
}

export interface MapState {
  centerCity: City;
  viewMode: 'geo' | 'time';
  loading: boolean;
  error: string | null;
  travelTimes: TravelTimeData;
}

export enum ViewMode {
  GEO = 'geo',
  TIME = 'time'
}