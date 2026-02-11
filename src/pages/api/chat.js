import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { userMessage, patientId } = req.body;

  const systemPrompt = `Eres el Especialista en Nutrición Digital de Salud360. 
  Tu metodología es el pre-diagnóstico clínico seguido de retos progresivos.

  REGLAS:
  1. Respuestas BREVES (máximo 2-3 frases).
  2. Tono: Profesional y motivador.
  3. RETOS: Hidratación 2.5L, Cena sin procesados, Regla del plato 50% vegetal, Caminata 15 min post-comida, Desayuno proteico, Masticación consciente, Cero azúcares líquidos, Snack frutos secos, Reducción de sal, Ayuno 12h.

  ESTRATEGIA: Primero identifica objetivos/alergias. Luego asigna SOLO UNO de los retos y pide al usuario que informe sus avances en la siguiente sesión.`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 150
      })
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(data.error?.message || 'Error en IA');

    const botContent = data.choices[0].message.content;

    // Guardar en Supabase (columna 'message')
    const { error: dbError } = await supabase
      .from('chat_history')
      .insert([
        { patient_id: patientId, role: 'user', message: userMessage },
        { patient_id: patientId, role: 'assistant', message: botContent }
      ]);

    if (dbError) console.error("Error DB al guardar:", dbError.message);

    res.status(200).json({ message: botContent });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}