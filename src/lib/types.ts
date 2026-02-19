// Types for ONIMIX Eagle Eye Pick

export interface Result {
  id: string;
  block_time: string;
  home_team: string;
  away_team: string;
  home_goals: number;
  away_goals: number;
  total_goals: number;
  over_15: boolean;
  over_25: boolean;
  created_at: string;
}

export interface Odds {
  id: string;
  block_time: string;
  home_team: string;
  away_team: string;
  home_odd: number;
  draw_odd: number;
  away_odd: number;
  goal_line: number;
  over_odd: number;
  under_odd: number;
  created_at: string;
}

export interface ParsedResult {
  block_time: string;
  home_team: string;
  away_team: string;
  home_goals: number;
  away_goals: number;
  total_goals: number;
  over_15: boolean;
  over_25: boolean;
}

export interface ParsedOdds {
  block_time: string;
  home_team: string;
  away_team: string;
  home_odd: number;
  draw_odd: number;
  away_odd: number;
  goal_line: number;
  over_odd: number;
  under_odd: number;
}

export interface HistoricalStats {
  totalMatches: number;
  avgGoals: number;
  over15Rate: number;
  over25Rate: number;
}

export interface TeamStats {
  avgScored: number;
  avgConceded: number;
  matchesPlayed: number;
}

export interface Prediction {
  match: ParsedOdds;
  historicalStats: HistoricalStats;
  teamStats: TeamStats;
  prediction: 'OVER 1.5' | 'LOW CONFIDENCE';
  confidence: number;
  status: 'SAFE' | 'MODERATE' | 'RISKY';
}

// Sporty vFootball API JSON structure
export interface SportyResponse {
  bizCode: number;
  data: {
    tournaments: Tournament[];
  };
}

export interface Tournament {
  events: Match[];
}

export interface Match {
  estimateStartTime: number;
  setScore: string;
  homeTeamName: string;
  awayTeamName: string;
  matchStatus: string;
}
