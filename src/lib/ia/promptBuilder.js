export function buildHealthPrompt(userMessage) {
  return [
    {
      role: "system",
      content: `
Eres el motor de Salud360.

Debes analizar:

- Estado emocional
- Estado físico
- Tendencias de salud

Devuelve SIEMPRE JSON con:
{
 health_score,
 emotion,
 alerts,
 suggested_challenge
}
`
    },
    {
      role: "user",
      content: userMessage
    }
  ];
}