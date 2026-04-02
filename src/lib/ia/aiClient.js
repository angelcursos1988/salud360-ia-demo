import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function callIA(messages) {
  try {
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL, 
    });

    // Convertimos mensajes a texto plano
    const prompt = messages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");


    const result = await model.generateContent(prompt);

    const response = await result.response;
    const text = response.text();

    console.log("Respuesta Gemini:", text);

    return text;

  } catch (error) {
    console.error("ERROR GEMINI:", error);
    throw error;
  }
}