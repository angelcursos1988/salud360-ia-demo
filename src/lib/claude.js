import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const systemPrompt = `Eres un asistente médico de pre-diagnóstico para Salud360.
Tu rol es:
1. Escuchar al paciente y hacer preguntas relevantes.
2. Recopilar síntomas y antecedentes.
3. Generar un resumen preliminar.
4. NUNCA dar diagnósticos definitivos.
5. SIEMPRE recomendar ver a un especialista.`;

export const chatWithGemini = async (messages) => {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.message || msg.content || ""
        }))
      ],
      model: "llama-3.3-70b-versatile", // Un modelo muy potente y gratuito
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error Groq:', error);
    return "Lo siento, hubo un error en la conexión. Verifica tu API Key de Groq.";
  }
};
<<<<<<< HEAD

export default chatWithGemini;
=======
>>>>>>> 6c130aa3c1847c31511077b71f1b8f5be1e4a6a9
