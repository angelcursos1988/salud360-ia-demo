import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;
// Solo creamos la instancia si hay API Key, para no romper el build
const groq = apiKey ? new Groq({ apiKey }) : null;

export const chatWithGemini = async (messages) => {
  try {
    if (!groq) {
      return "Configuración incompleta: Falta la API Key en Vercel.";
    }

    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Eres un asistente médico de Salud360." },
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.message || msg.content || ""
        }))
      ],
      model: "llama-3.3-70b-versatile",
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return "Error al conectar con la IA.";
  }
};

export default chatWithGemini;