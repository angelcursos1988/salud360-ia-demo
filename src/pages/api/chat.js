import { createClient } from '@supabase/supabase-client';

// Configuración de Supabase para guardar el historial
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userMessage, patientId } = req.body;

  // --- CONFIGURACIÓN DEL COMPORTAMIENTO DEL BOT ---
  const systemPrompt = `
    Eres un asistente médico de la plataforma Salud360.
    Tu objetivo es realizar un pre-diagnóstico conversacional.
    
    REGLAS ESTRICTAS:
    1. Responde de forma MUY BREVE (máximo 2 frases).
    2. No des parrafadas ni listas largas de consejos.
    3. Sé empático (ej. "Siento mucho que estés pasando por eso").
    4. Termina SIEMPRE con una pregunta corta para obtener más detalles.
    5. No diagnostiques con seguridad, usa términos como "podría ser" o "parece".
  `;

  try {
    // 1. Llamada a la IA (Groq en este ejemplo, asegúrate de tener la KEY en .env)
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // o el modelo que prefieras
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 100 // Límite físico para evitar parrafadas
      })
    });

    const data = await aiResponse.json();
    
    if (!aiResponse.ok) {
      throw new Error(data.error?.message || 'Error en la IA');
    }

    const botContent = data.choices[0].message.content;

    // 2. GUARDAR EN SUPABASE (Vital para el informe PDF)
    // Guardamos tanto el mensaje del usuario como el de la IA
    const { error: dbError } = await supabase
      .from('chat_history')
      .insert([
        { patient_id: patientId, role: 'user', content: userMessage },
        { patient_id: patientId, role: 'assistant', content: botContent }
      ]);

    if (dbError) {
      console.error("Error guardando en Supabase:", dbError);
      // No bloqueamos la respuesta aunque falle la DB, pero lo logueamos
    }

    // 3. Respuesta al Frontend
    return res.status(200).json({ message: botContent });

  } catch (error) {
    console.error("Error en la ruta /api/chat:", error);
    return res.status(500).json({ error: "Hubo un problema con la conexión del asistente." });
  }
}