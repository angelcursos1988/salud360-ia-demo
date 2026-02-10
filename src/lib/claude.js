import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const systemPrompt = `Eres un asistente médico de pre-diagnóstico para Salud360.
Tu rol es:
1. Escuchar al paciente y hacer preguntas relevantes
2. Recopilar síntomas y antecedentes
3. Generar un resumen preliminar
4. NUNCA dar diagnósticos definitivos
5. SIEMPRE recomendar ver a especialista
6. Ser empático y profesional`;

export const chatWithClaude = async (messages) => {
  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.message || msg.content
      }))
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Error Claude:', error);
    throw error;
  }
};