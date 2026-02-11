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

  REGLAS ESTRICTAS:
  1. Respuestas BREVES (máximo 2-3 frases).
  2. Tono: Profesional, clínico y motivador.
  3. RETOS DISPONIBLES QUE DEBES ASIGNAR: 
     - Hidratación 2.5L (Mejorar filtrado renal).
     - Cena sin procesados (Reducir inflamación).
     - Regla del plato 50% vegetal (Aporte fibra).
     - Caminata 15 min post-comida (Control glucemia).
     - Desayuno proteico (Evitar hambre voraz).
     - Masticación consciente (Señales de saciedad).
     - Cero azúcares líquidos (Carga glucémica).
     - Snack frutos secos (Grasas saludables).
     - Reducción de sal (Tensión arterial).
     - Ayuno nocturno 12h (Reposo digestivo).

  ESTRATEGIA: Analiza los objetivos del usuario. Asigna SOLO UNO de los retos anteriores y pídele que lo registre en su próximo mensaje.`;

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

    // Guardar en Supabase (usando la columna 'message')
    const { error: dbError } = await supabase
      .from('chat_history')
      .insert([
        { patient_id: patientId, role: 'user', message: userMessage },
        { patient_id: patientId, role: 'assistant', message: botContent }
      ]);

    if (dbError) console.error("Error DB:", dbError.message);

    res.status(200).json({ message: botContent });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}