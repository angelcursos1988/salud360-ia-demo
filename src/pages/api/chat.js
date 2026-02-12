import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { userMessage, patientId, systemPrompt: patientContext } = req.body;

  // Si no hay API KEY, devolvemos un error claro
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Falta GROQ_API_KEY en las variables de entorno" });
  }

  const isGreeting = userMessage === "[SALUDO_INICIAL_SISTEMA]";
  
  const masterRules = `Eres Salud360. REGLAS:
  1. Sé breve (máximo 2 párrafos).
  2. Si el usuario da datos biométricos, añade al final: [UPDATE:weight=valor,sleep_hours=valor,stress_level=valor]. Usa XX para datos no mencionados.
  3. Tono profesional y motivador. Usa Markdown.`;

  try {
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [
          { role: "system", content: masterRules + "\n" + (patientContext || "") },
          { role: "user", content: isGreeting ? "Hola, preséntate brevemente y pregunta si me he pesado hoy." : userMessage }
        ],
        temperature: 0.5
      })
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(data.error?.message || 'Error en Groq');

    const botContent = data.choices[0].message.content;

    // Guardar en Supabase el mensaje de la IA
    if (patientId) {
      await supabase.from('chat_history').insert([
        { patient_id: patientId, role: 'assistant', message: botContent }
      ]);
    }

    res.status(200).json({ message: botContent });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}