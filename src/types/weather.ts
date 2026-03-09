export type ConditionType =
  | 'warm'
  | 'dry-mild'
  | 'dry-cool'
  | 'windy-cold'
  | 'wet-slush'
  | 'wet-cold'
  | 'mild-damp'
  | 'dry-cold';

export interface PeriodData {
  name: 'morning' | 'daytime' | 'afternoon' | 'evening';
  startHour: number;
  endHour: number;
  temp: number;
  feelsLike: number;
  precipitation: number;
  precipProbability: number;
  wind: number;
  windGust: number;
  humidity: number;
  dewPoint: number;
  cloudCover: number;
  symbol: string;
}

export interface DailySummary {
  minTemp: number;
  maxTemp: number;
  totalPrecipitation: number;
  maxWind: number;
  avgCloudCover: number;
}

export interface WeatherCache {
  date: string;
  fetchedAt: string;
  periods: PeriodData[];
  summary: DailySummary;
  conditionType: ConditionType;
  windWarning: boolean;
  yrnoUpdatedAt: string;
  yrnoExpires?: string;
}
