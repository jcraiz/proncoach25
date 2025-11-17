
export interface Language {
  code: string;
  name: string;
  voice: string;
}

export interface Assessment {
  score: number;
  feedback: string;
}

export enum AppState {
  INPUT = 'INPUT',
  PRACTICE = 'PRACTICE',
}
