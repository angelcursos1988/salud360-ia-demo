import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userMessage, patientId, systemPrompt: patientContext } = req.body;

  const isGreeting = userMessage === "[SALUDO_INICIAL_SISTEMA]";

  const masterRules = `Eres Salud360, un asistente clínico de élite.
  
  COMPORTAMIENTO:
  1. Si es saludo inicial: Da la bienvenida brevemente y pregunta si el usuario se ha pesado hoy.
  2. Si el usuario menciona peso, sueño o estrés: Responde amablemente y añade AL FINAL del mensaje el tag: [UPDATE:weight=XX,sleep_hours=XX,stress_level=XX] sustituyendo XX por el valor.
  3. Si no hay datos nuevos, NO pongas el tag [UPDATE].
  4. Sé conciso: Máximo 2 párrafos.
  5. Retos: Ocasionalmente añade [RETO: Nombre del Reto] al final.
  6. Usa Markdown para negritas.`;

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
          { role: "system", content: masterRules + "\n" + patientContext },
          { role: "user", content: isGreeting ? "Hola, preséntate brevemente y pregunta por mi peso de hoy." : userMessage }
        ],
        temperature: 0.4, // Menor temperatura = mayor obediencia a las reglas
        max_tokens: 800
      })
    });

    const data = await aiResponse.json();
    const botContent = data.choices[0].message.content;

    // Guardar respuesta de la IA en el historial
    await supabase.from('chat_history').insert([{ 
      patient_id: patientId, 
      role: 'assistant', 
      message: botContent 
    }]);

    res.status(200).json({ message: botContent });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error en la comunicación con la IA" });
  }
}