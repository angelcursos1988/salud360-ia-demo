import { createClient } from '@supabase/supabase-js';

// Inicializamos Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userMessage, patientId } = req.body;

  try {
    // 1. LLAMADA A LA IA (GROQ/OPENAI)
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [
          { 
            role: "system", 
            content: "Eres un asistente médico de Salud360. REGLA DE ORO: Tus respuestas deben ser MUY BREVES (máximo 2 frases). Sé empático y termina siempre con una pregunta corta para el paciente. No des parrafadas." 
          },
          { role: "user", content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 100
      })
    });

    const data = await aiResponse.json();
    
    if (!aiResponse.ok) throw new Error(data.error?.message || 'Error en IA');

    const botContent = data.choices[0].message.content;

    // 2. GUARDAR EN SUPABASE
    // Nota: Si tu tabla usa la columna 'message', cambia 'content' por 'message' abajo.
    const { error: dbError } = await supabase
      .from('chat_history')
      .insert([
        { patient_id: patientId, role: 'user', content: userMessage },
        { patient_id: patientId, role: 'assistant', content: botContent }
      ]);

    if (dbError) console.error("Error guardando historial:", dbError);

    // 3. ENVIAR RESPUESTA AL FRONTEND
    res.status(200).json({ message: botContent });

  } catch (error) {
    console.error("LOG ERROR API:", error);
    res.status(500).json({ error: "Error de conexión con el asistente" });
  }
}