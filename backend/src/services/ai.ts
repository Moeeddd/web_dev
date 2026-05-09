import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../config/logger';

interface AIAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  incidentType: string;
  injuries: number;
  damageEstimate: string;
  recommendedPriority: string;
  operationalImpact: string;
  recommendations: string[];
}

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!config.openaiApiKey) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openai;
}

export async function analyzeDistressMessage(
  message: string,
  shipName: string,
  position: { lat: number; lng: number }
): Promise<AIAnalysis> {
  const client = getOpenAI();

  if (!client) {
    logger.info('OpenAI not configured, using rule-based analysis');
    return ruleBasedAnalysis(message);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a maritime crisis analysis AI. Analyze the following distress message from a cargo ship and return a JSON object with these fields:
- severity: "low" | "medium" | "high" | "critical"
- incidentType: string describing the type of incident
- injuries: number of reported or estimated injuries
- damageEstimate: string describing estimated damage
- recommendedPriority: string describing recommended response priority
- operationalImpact: string describing impact on operations
- recommendations: array of string recommendations

Return ONLY valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: `Ship: ${shipName}\nPosition: ${position.lat}°N, ${position.lng}°E\nDistress Message: "${message}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    return parsed as AIAnalysis;
  } catch (error) {
    logger.error('OpenAI analysis failed, falling back to rule-based', { error });
    return ruleBasedAnalysis(message);
  }
}

function ruleBasedAnalysis(message: string): AIAnalysis {
  const lower = message.toLowerCase();

  let severity: AIAnalysis['severity'] = 'medium';
  let incidentType = 'General distress';
  let injuries = 0;
  let operationalImpact = 'Moderate';

  // Fire detection
  if (lower.includes('fire') || lower.includes('explosion') || lower.includes('burning')) {
    severity = 'critical';
    incidentType = 'Fire/Explosion';
    operationalImpact = 'Severe - ship may be incapacitated';
  }

  // Flooding/sinking
  if (lower.includes('water') || lower.includes('flood') || lower.includes('sink') || lower.includes('hull breach')) {
    severity = 'critical';
    incidentType = 'Flooding/Hull Breach';
    operationalImpact = 'Critical - risk of capsizing';
  }

  // Medical
  if (lower.includes('medical') || lower.includes('injury') || lower.includes('injured') || lower.includes('unconscious')) {
    severity = severity === 'critical' ? 'critical' : 'high';
    incidentType = incidentType === 'General distress' ? 'Medical Emergency' : incidentType;
  }

  // Propulsion
  if (lower.includes('engine') || lower.includes('propulsion') || lower.includes('power')) {
    severity = severity === 'critical' ? 'critical' : 'high';
    incidentType = incidentType === 'General distress' ? 'Propulsion Failure' : incidentType;
    operationalImpact = 'Ship may be adrift';
  }

  // Collision
  if (lower.includes('collision') || lower.includes('impact') || lower.includes('struck')) {
    severity = 'critical';
    incidentType = 'Collision';
  }

  // Extract injury count
  const injuryMatch = lower.match(/(\d+)\s*(injured|casualties|crew)/);
  if (injuryMatch) {
    injuries = parseInt(injuryMatch[1]);
  }

  const recommendations: string[] = [];
  if (severity === 'critical') {
    recommendations.push('Deploy emergency rescue assets immediately');
    recommendations.push('Alert nearest coast guard');
    recommendations.push('Prepare for potential evacuation');
  }
  if (lower.includes('fire')) {
    recommendations.push('Activate fire suppression systems');
    recommendations.push('Prepare firefighting vessels');
  }
  if (lower.includes('water') || lower.includes('flood')) {
    recommendations.push('Activate bilge pumps');
    recommendations.push('Prepare salvage tugs');
  }
  recommendations.push('Dispatch nearest vessel for assistance');
  recommendations.push('Maintain open communications channel');

  return {
    severity,
    incidentType,
    injuries,
    damageEstimate: severity === 'critical' ? 'Major structural damage likely' : 'Assessment pending',
    recommendedPriority: severity === 'critical' ? 'IMMEDIATE' : severity === 'high' ? 'URGENT' : 'STANDARD',
    operationalImpact,
    recommendations,
  };
}

export async function getFleetAdvisorSuggestion(
  context: {
    shipsInDanger: number;
    activeAlerts: number;
    weatherSeverity: string;
    fuelCriticalShips: string[];
  }
): Promise<string[]> {
  const client = getOpenAI();

  if (!client) {
    return generateRuleBasedAdvice(context);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a maritime fleet operations advisor. Provide 3-5 brief, actionable recommendations based on the fleet situation. Return a JSON array of strings.',
        },
        {
          role: 'user',
          content: JSON.stringify(context),
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '[]';
    return JSON.parse(content);
  } catch {
    return generateRuleBasedAdvice(context);
  }
}

function generateRuleBasedAdvice(context: {
  shipsInDanger: number;
  activeAlerts: number;
  fuelCriticalShips: string[];
}): string[] {
  const advice: string[] = [];

  if (context.shipsInDanger > 0) {
    advice.push(`${context.shipsInDanger} ships in danger zones - consider emergency rerouting`);
  }
  if (context.fuelCriticalShips.length > 0) {
    advice.push(`Fuel critical: ${context.fuelCriticalShips.join(', ')} - arrange resupply or port diversion`);
  }
  if (context.activeAlerts > 5) {
    advice.push('High alert volume - prioritize critical incidents and acknowledge resolved alerts');
  }
  advice.push('Maintain increased monitoring of Strait of Hormuz transit corridor');
  advice.push('Ensure all vessels have updated restricted zone data');

  return advice;
}
