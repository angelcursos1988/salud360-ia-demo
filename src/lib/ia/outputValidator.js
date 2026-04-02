function stripJsonCodeBlock(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (match && match[1]) return match[1].trim();
  return trimmed;
}

export function safeParseIA(text) {
  const cleaned = stripJsonCodeBlock(text);

  try {
    const parsed = JSON.parse(cleaned);

    return {
      health_score: typeof parsed.health_score === 'number' ? parsed.health_score : 50,
      emotion: typeof parsed.emotion === 'string' ? parsed.emotion : 'neutral',
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      suggested_challenge: parsed.suggested_challenge ?? null,
      risk_level: parsed.risk_level ?? null,
      recommendation: parsed.recommendation ?? null,
      message: parsed.message ?? ''
    };
  } catch {
    return {
      health_score: 50,
      emotion: 'neutral',
      alerts: [],
      suggested_challenge: null,
      risk_level: null,
      recommendation: null,
      message: cleaned
    };
  }
}