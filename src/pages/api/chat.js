import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { userMessage, patientId } = req.body;

  try {
    // 1. LLAMADA A GROQ (IA)
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
            content: "Eres un asistente médico breve de Salud360. Responde en máximo 2 frases. Sé empático y termina con una pregunta corta." 
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
    // Usamos 'message' porque así está definido en tu base de datos
    const { error: dbError } = await supabase
      .from('chat_history')
      .insert([
        { patient_id: patientId, role: 'user', message: userMessage },
        { patient_id: patientId, role: 'assistant', message: botContent }
      ]);

    if (dbError) throw new Error(`Error DB: ${dbError.message}`);

    res.status(200).json({ message: botContent });

  } catch (error) {
    console.error("LOG ERROR API:", error.message);
    res.status(500).json({ error: error.message });
  }
}