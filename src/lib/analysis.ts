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
export function calculateTeamStats(results: Result[], teamName: string): TeamStats & { over15Rate: number } {
  const teamMatches = results.filter(
    r => r.home_team.toLowerCase() === teamName.toLowerCase() ||
         r.away_team.toLowerCase() === teamName.toLowerCase()
  );

  if (teamMatches.length === 0) {
    return { avgScored: 0, avgConceded: 0, matchesPlayed: 0, over15Rate: 0 };
  }

  let goalsScored = 0;
  let goalsConceded = 0;
  let over15Count = 0;

  teamMatches.forEach(match => {
    if (match.over_15) {
      over15Count++;
    }
    
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
    over15Rate: (over15Count / teamMatches.length) * 100,
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
  const teamAvgOver15Rate = (homeTeamStats.over15Rate + awayTeamStats.over15Rate) / 2;

  // Calculate expected goals based on team stats
  const expectedGoals = teamAvgScored + teamAvgConceded;
  
  // Decision rules - combine block time stats and team performance
  const isSafe = 
    historicalStats.over15Rate >= 75 && 
    historicalStats.avgGoals >= 2.2 && 
    expectedGoals >= 2.0 &&
    teamAvgOver15Rate >= 65 &&
    historicalStats.totalMatches >= 10;
    
  const isModerate = 
    historicalStats.over15Rate >= 60 && 
    historicalStats.avgGoals >= 1.8 && 
    expectedGoals >= 1.5 &&
    teamAvgOver15Rate >= 55 &&
    historicalStats.totalMatches >= 5;
  
  let prediction: 'OVER 1.5' | 'LOW CONFIDENCE';
  let confidence: number;
  let status: 'SAFE' | 'MODERATE' | 'RISKY';

  if (isSafe) {
    prediction = 'OVER 1.5';
    confidence = Math.min(95, Math.round(historicalStats.over15Rate));
    status = 'SAFE';
  } else if (isModerate) {
    prediction = 'OVER 1.5';
    confidence = Math.round(historicalStats.over15Rate);
    status = 'MODERATE';
  } else {
    prediction = 'LOW CONFIDENCE';
    confidence = Math.max(0, Math.round(historicalStats.over15Rate));
    status = 'RISKY';
  }

  return {
    match,
    historicalStats,
    teamStats: {
      avgScored: teamAvgScored,
      avgConceded: teamAvgConceded,
      matchesPlayed: Math.min(homeTeamStats.matchesPlayed, awayTeamStats.matchesPlayed),
      over15Rate: teamAvgOver15Rate,
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

// Parse odds from tab-separated string (supports both old and new format)
// Old format: Time, Event, 1, X, 2, Goals, Over, Under
// New format: Date, Time, Event, 1, X, 2, Goals, Over, Under
export function parseOddsInput(input: string): { valid: boolean; data?: ParsedOdds[]; error?: string } {
  const lines = input.trim().split('\n');
  
  if (lines.length < 2) {
    return { valid: false, error: 'No data rows found. Please include header and at least one data row.' };
  }

  // Detect format by checking header
  const headerLine = lines[0].toLowerCase();
  const hasDateColumn = headerLine.includes('date');
  
  // Skip header row
  const dataLines = lines.slice(1);
  const parsedOdds: ParsedOdds[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    
    // Determine column indices based on format
    let dateCol: string | undefined;
    let timeCol: string;
    let eventCol: string;
    let homeOddIdx: number;
    let drawOddIdx: number;
    let awayOddIdx: number;
    let goalLineIdx: number;
    let overOddIdx: number;
    let underOddIdx: number;
    
    if (hasDateColumn) {
      // New format: Date, Time, Event, 1, X, 2, Goals, Over, Under
      if (parts.length < 9) {
        return { valid: false, error: `Line ${i + 2}: Expected 9 columns with date, got ${parts.length}. Format: Date, Time, Event, 1, X, 2, Goals, Over, Under` };
      }
      dateCol = parts[0].trim();
      timeCol = parts[1].trim();
      eventCol = parts[2].trim();
      homeOddIdx = 3;
      drawOddIdx = 4;
      awayOddIdx = 5;
      goalLineIdx = 6;
      overOddIdx = 7;
      underOddIdx = 8;
    } else {
      // Old format: Time, Event, 1, X, 2, Goals, Over, Under
      if (parts.length < 8) {
        return { valid: false, error: `Line ${i + 2}: Expected at least 8 columns, got ${parts.length}. Format: Time, Event, 1, X, 2, Goals, Over, Under` };
      }
      timeCol = parts[0].trim();
      eventCol = parts[1].trim();
      homeOddIdx = 2;
      drawOddIdx = 3;
      awayOddIdx = 4;
      goalLineIdx = 5;
      overOddIdx = 6;
      underOddIdx = 7;
    }
    
    // Parse event "FCA - HDH" to get teams
    const teamParts = eventCol.split(' - ');
    if (teamParts.length !== 2) {
      return { valid: false, error: `Line ${i + 2}: Invalid event format. Expected "HomeTeam - AwayTeam"` };
    }

    const homeTeam = teamParts[0].trim();
    const awayTeam = teamParts[1].trim();

    const homeOdd = parseFloat(parts[homeOddIdx]);
    const drawOdd = parseFloat(parts[drawOddIdx]);
    const awayOdd = parseFloat(parts[awayOddIdx]);
    const goalLine = parseFloat(parts[goalLineIdx]);
    const overOdd = parseFloat(parts[overOddIdx]);
    const underOdd = parseFloat(parts[underOddIdx]);

    if (isNaN(homeOdd) || isNaN(drawOdd) || isNaN(awayOdd) ||
        isNaN(goalLine) || isNaN(overOdd) || isNaN(underOdd)) {
      return { valid: false, error: `Line ${i + 2}: Invalid numeric values` };
    }

    if (!timeCol || !homeTeam || !awayTeam) {
      return { valid: false, error: `Line ${i + 2}: Missing required fields` };
    }

    // Parse date to ISO format (DD/MM/YYYY -> YYYY-MM-DD)
    let matchDate: string | undefined;
    if (dateCol) {
      const dateParts = dateCol.split('/');
      if (dateParts.length === 3) {
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        matchDate = `${year}-${month}-${day}`;
      }
    }

    parsedOdds.push({
      block_time: timeCol,
      home_team: homeTeam,
      away_team: awayTeam,
      home_odd: homeOdd,
      draw_odd: drawOdd,
      away_odd: awayOdd,
      goal_line: goalLine,
      over_odd: overOdd,
      under_odd: underOdd,
      match_date: matchDate,
    });
  }

  if (parsedOdds.length === 0) {
    return { valid: false, error: 'No valid data rows found' };
  }

  return { valid: true, data: parsedOdds };
}

// Parse tab or comma-separated results input
// Old format: "08:24\tLEV 0-2 HSV" or "08:24,LEV 0-2 HSV"
// New format: "26/01/2026\t08:24\tLEV 0-2 HSV" (with date)
export function parseResultsInput(input: string): { valid: boolean; data?: ParsedResult[]; error?: string } {
  const lines = input.trim().split('\n');
  const parsedResults: ParsedResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by tab or comma
    const parts = line.split(/[\t,]/);
    
    // Detect format: if first part looks like a date (DD/MM/YYYY), use new format
    let dateCol: string | undefined;
    let timeCol: string;
    let resultCol: string;
    
    const firstPart = parts[0].trim();
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    
    if (datePattern.test(firstPart)) {
      // New format: Date, Time, Result
      if (parts.length < 3) {
        return { valid: false, error: `Line ${i + 1}: Expected Date, Time, Result format` };
      }
      dateCol = firstPart;
      timeCol = parts[1].trim();
      resultCol = parts[2].trim();
    } else {
      // Old format: Time, Result
      if (parts.length < 2) {
        return { valid: false, error: `Line ${i + 1}: Missing separator between time and result (use tab or comma)` };
      }
      timeCol = firstPart;
      resultCol = parts[1].trim();
    }

    // Parse result "LEV 0-2 HSV" to get teams and score
    // Format: TEAM_A GOAL-GOAL TEAM_B
    const resultParts = resultCol.split(/\s+/);
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

    if (!timeCol || !homeTeam || !awayTeam) {
      return { valid: false, error: `Line ${i + 1}: Missing required fields` };
    }

    const totalGoals = homeGoals + awayGoals;

    // Parse date to ISO format (DD/MM/YYYY -> YYYY-MM-DD)
    let matchDate: string | undefined;
    if (dateCol) {
      const dateParts = dateCol.split('/');
      if (dateParts.length === 3) {
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        matchDate = `${year}-${month}-${day}`;
      }
    }

    parsedResults.push({
      block_time: timeCol,
      home_team: homeTeam,
      away_team: awayTeam,
      home_goals: homeGoals,
      away_goals: awayGoals,
      total_goals: totalGoals,
      over_15: totalGoals >= 2,
      over_25: totalGoals >= 3,
      match_date: matchDate,
    });
  }

  if (parsedResults.length === 0) {
    return { valid: false, error: 'No valid data rows found' };
  }

  return { valid: true, data: parsedResults };
}
