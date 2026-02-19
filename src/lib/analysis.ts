import type { Result, ParsedOdds, Prediction, HistoricalStats, TeamStats, ParsedResult } from './types';

// Convert timestamp to block time (HH:MM format)
export function timestampToBlockTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Parse setScore string "2:1" to goals
export function parseScore(score: string): { homeGoals: number; awayGoals: number } {
  const parts = score.split(':');
  if (parts.length !== 2) {
    return { homeGoals: 0, awayGoals: 0 };
  }
  const homeGoals = parseInt(parts[0], 10) || 0;
  const awayGoals = parseInt(parts[1], 10) || 0;
  return { homeGoals, awayGoals };
}

// Calculate team statistics
export function calculateTeamStats(results: Result[], teamName: string): TeamStats {
  const teamMatches = results.filter(
    r => r.home_team.toLowerCase() === teamName.toLowerCase() ||
         r.away_team.toLowerCase() === teamName.toLowerCase()
  );

  if (teamMatches.length === 0) {
    return { avgScored: 0, avgConceded: 0, matchesPlayed: 0 };
  }

  let goalsScored = 0;
  let goalsConceded = 0;

  teamMatches.forEach(match => {
    if (match.home_team.toLowerCase() === teamName.toLowerCase()) {
      goalsScored += match.home_goals;
      goalsConceded += match.away_goals;
    } else {
      goalsScored += match.away_goals;
      goalsConceded += match.home_goals;
    }
  });

  return {
    avgScored: goalsScored / teamMatches.length,
    avgConceded: goalsConceded / teamMatches.length,
    matchesPlayed: teamMatches.length,
  };
}

// Calculate historical stats for a specific block time
export function calculateBlockTimeStats(results: Result[], blockTime: string): HistoricalStats {
  const blockMatches = results.filter(r => r.block_time === blockTime);

  if (blockMatches.length === 0) {
    return { totalMatches: 0, avgGoals: 0, over15Rate: 0, over25Rate: 0 };
  }

  const totalGoals = blockMatches.reduce((sum, r) => sum + r.total_goals, 0);
  const over15Count = blockMatches.filter(r => r.over_15).length;
  const over25Count = blockMatches.filter(r => r.over_25).length;

  return {
    totalMatches: blockMatches.length,
    avgGoals: totalGoals / blockMatches.length,
    over15Rate: (over15Count / blockMatches.length) * 100,
    over25Rate: (over25Count / blockMatches.length) * 100,
  };
}

// Determine prediction based on analysis
export function analyzeMatch(
  match: ParsedOdds,
  results: Result[]
): Prediction {
  // Get historical stats for this block time
  const historicalStats = calculateBlockTimeStats(results, match.block_time);
  
  // Get team stats for both teams
  const homeTeamStats = calculateTeamStats(results, match.home_team);
  const awayTeamStats = calculateTeamStats(results, match.away_team);

  // Calculate average team stats
  const teamAvgScored = (homeTeamStats.avgScored + awayTeamStats.avgScored) / 2;
  const teamAvgConceded = (homeTeamStats.avgConceded + awayTeamStats.avgConceded) / 2;

  // Decision rules
  const isSafe = historicalStats.over15Rate >= 75 && historicalStats.avgGoals >= 2.2;
  const isModerate = historicalStats.over15Rate >= 60 && historicalStats.avgGoals >= 1.8;
  
  let prediction: 'OVER 1.5' | 'LOW CONFIDENCE';
  let confidence: number;
  let status: 'SAFE' | 'MODERATE' | 'RISKY';

  if (isSafe) {
    prediction = 'OVER 1.5';
    confidence = Math.min(95, Math.round(historicalStats.over15Rate + 10));
    status = 'SAFE';
  } else if (isModerate) {
    prediction = 'OVER 1.5';
    confidence = Math.min(75, Math.round(historicalStats.over15Rate));
    status = 'MODERATE';
  } else {
    prediction = 'LOW CONFIDENCE';
    confidence = Math.max(0, Math.round(50 - (75 - historicalStats.over15Rate)));
    status = 'RISKY';
  }

  return {
    match,
    historicalStats,
    teamStats: {
      avgScored: teamAvgScored,
      avgConceded: teamAvgConceded,
      matchesPlayed: Math.min(homeTeamStats.matchesPlayed, awayTeamStats.matchesPlayed),
    },
    prediction,
    confidence,
    status,
  };
}

// Validate JSON structure
export function validateSportyJson(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON structure' };
  }

  const obj = data as Record<string, unknown>;
  
  if (typeof obj.bizCode !== 'number') {
    return { valid: false, error: 'Missing bizCode' };
  }

  if (!obj.data || typeof obj.data !== 'object') {
    return { valid: false, error: 'Missing data object' };
  }

  const dataObj = obj.data as Record<string, unknown>;
  
  if (!Array.isArray(dataObj.tournaments)) {
    return { valid: false, error: 'Missing or invalid tournaments array' };
  }

  return { valid: true };
}

// Parse odds from tab-separated string
export function parseOddsInput(input: string): { valid: boolean; data?: ParsedOdds[]; error?: string } {
  const lines = input.trim().split('\n');
  
  if (lines.length < 2) {
    return { valid: false, error: 'No data rows found. Please include header and at least one data row.' };
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const parsedOdds: ParsedOdds[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    
    if (parts.length < 8) {
      return { valid: false, error: `Line ${i + 2}: Expected at least 8 columns, got ${parts.length}. Format: Time, Event, 1, X, 2, Goals, Over, Under` };
    }

    const blockTime = parts[0].trim();
    const event = parts[1].trim();
    
    // Parse event "FCA - HDH" to get teams
    const teamParts = event.split(' - ');
    if (teamParts.length !== 2) {
      return { valid: false, error: `Line ${i + 2}: Invalid event format. Expected "HomeTeam - AwayTeam"` };
    }

    const homeTeam = teamParts[0].trim();
    const awayTeam = teamParts[1].trim();

    const homeOdd = parseFloat(parts[2]);
    const drawOdd = parseFloat(parts[3]);
    const awayOdd = parseFloat(parts[4]);
    const goalLine = parseFloat(parts[5]);
    const overOdd = parseFloat(parts[6]);
    const underOdd = parseFloat(parts[7]);

    if (isNaN(homeOdd) || isNaN(drawOdd) || isNaN(awayOdd) ||
        isNaN(goalLine) || isNaN(overOdd) || isNaN(underOdd)) {
      return { valid: false, error: `Line ${i + 2}: Invalid numeric values` };
    }

    if (!blockTime || !homeTeam || !awayTeam) {
      return { valid: false, error: `Line ${i + 2}: Missing required fields` };
    }

    parsedOdds.push({
      block_time: blockTime,
      home_team: homeTeam,
      away_team: awayTeam,
      home_odd: homeOdd,
      draw_odd: drawOdd,
      away_odd: awayOdd,
      goal_line: goalLine,
      over_odd: overOdd,
      under_odd: underOdd,
    });
  }

  if (parsedOdds.length === 0) {
    return { valid: false, error: 'No valid data rows found' };
  }

  return { valid: true, data: parsedOdds };
}

// Parse tab-separated results input (e.g., "08:24\tLEV 0-2 HSV")
export function parseResultsInput(input: string): { valid: boolean; data?: ParsedResult[]; error?: string } {
  const lines = input.trim().split('\n');
  const parsedResults: ParsedResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by tab to get time and result
    const parts = line.split('\t');
    if (parts.length < 2) {
      return { valid: false, error: `Line ${i + 1}: Missing tab separator between time and result` };
    }

    const blockTime = parts[0].trim();
    const result = parts[1].trim();

    // Parse result "LEV 0-2 HSV" to get teams and score
    // Format: TEAM_A GOAL-GOAL TEAM_B
    const resultParts = result.split(/\s+/);
    if (resultParts.length !== 3) {
      return { valid: false, error: `Line ${i + 1}: Invalid result format. Expected "TEAM GOAL-GOAL TEAM"` };
    }

    const homeTeam = resultParts[0];
    const score = resultParts[1];
    const awayTeam = resultParts[2];

    // Parse score "0-2" to goals
    const scoreParts = score.split('-');
    if (scoreParts.length !== 2) {
      return { valid: false, error: `Line ${i + 1}: Invalid score format. Expected "GOAL-GOAL"` };
    }

    const homeGoals = parseInt(scoreParts[0], 10);
    const awayGoals = parseInt(scoreParts[1], 10);

    if (isNaN(homeGoals) || isNaN(awayGoals)) {
      return { valid: false, error: `Line ${i + 1}: Invalid score values` };
    }

    if (!blockTime || !homeTeam || !awayTeam) {
      return { valid: false, error: `Line ${i + 1}: Missing required fields` };
    }

    const totalGoals = homeGoals + awayGoals;

    parsedResults.push({
      block_time: blockTime,
      home_team: homeTeam,
      away_team: awayTeam,
      home_goals: homeGoals,
      away_goals: awayGoals,
      total_goals: totalGoals,
      over_15: totalGoals >= 2,
      over_25: totalGoals >= 3,
    });
  }

  if (parsedResults.length === 0) {
    return { valid: false, error: 'No valid data rows found' };
  }

  return { valid: true, data: parsedResults };
}
