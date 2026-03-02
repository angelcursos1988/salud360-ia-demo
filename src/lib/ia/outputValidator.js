export function safeParseIA(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {
      health_score: 50,
      emotion: "neutral",
      alerts: [],
      suggested_challenge: null
    };
  }
}