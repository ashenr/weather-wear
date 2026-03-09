export interface YrnoInstantDetails {
  air_temperature: number;
  relative_humidity: number;
  dew_point_temperature?: number;
  wind_speed: number;
  wind_speed_of_gust?: number;
  wind_from_direction?: number;
  air_pressure_at_sea_level?: number;
  cloud_area_fraction: number;
  fog_area_fraction?: number;
  ultraviolet_index_clear_sky?: number;
}

export interface YrnoPeriodDetails {
  precipitation_amount: number;
  precipitation_amount_min?: number;
  precipitation_amount_max?: number;
  probability_of_precipitation: number;
  probability_of_thunder?: number;
}

export interface YrnoTimeseries {
  time: string;
  data: {
    instant: { details: YrnoInstantDetails };
    next_1_hours?: {
      summary: { symbol_code: string };
      details: YrnoPeriodDetails;
    };
    next_6_hours?: {
      summary: { symbol_code: string };
      details: { precipitation_amount: number; probability_of_precipitation: number };
    };
  };
}

export interface YrnoResponse {
  properties: {
    meta: { updated_at: string };
    timeseries: YrnoTimeseries[];
  };
}

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

export type ConditionType =
  | 'warm'
  | 'dry-mild'
  | 'dry-cool'
  | 'windy-cold'
  | 'wet-slush'
  | 'wet-cold'
  | 'mild-damp'
  | 'dry-cold';

export interface WeatherCacheDoc {
  date: string;
  fetchedAt: string;
  periods: PeriodData[];
  summary: DailySummary;
  conditionType: ConditionType;
  windWarning: boolean;
  yrnoUpdatedAt: string;
  yrnoExpires?: string;
}
