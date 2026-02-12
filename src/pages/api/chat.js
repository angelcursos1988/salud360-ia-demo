import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // 1. Recibimos el systemPrompt (que trae los datos del paciente) desde el componente
  const { userMessage, patientId, systemPrompt: patientContext } = req.body;

  // 2. Definimos las reglas maestras de la IA (Tono y Retos)
  const masterRules = `Eres el Especialista en Nutrición Digital de Salud360. 
  Tu metodología es el pre-diagnóstico clínico seguido de retos progresivos.

  REGLAS DE RESPUESTA:
  1. Respuestas BREVES (máximo 2-3 frases).
  2. Tono: Profesional y motivador.
  3. ESTRATEGIA: Usa los datos del paciente proporcionados para personalizar el consejo. 
     Asigna SOLO UNO de los retos y pide al usuario que informe sus avances.

  LISTA DE RETOS DISPONIBLES:
  Hidratación 2.5L, Cena sin procesados, Regla del plato 50% vegetal, Caminata 15 min post-comida, 
  Desayuno proteico, Masticación consciente, Cero azúcares líquidos, Snack frutos secos, 
  Reducción de sal, Ayuno 12h.`;

  // 3. Unimos las reglas maestras con los datos específicos del paciente
  const finalSystemPrompt = `${masterRules}\n\n${patientContext}`;

  try {
    // 4. Llamada a Groq con todo el contexto
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 250 // Un poco más de margen para que no corte la respuesta
      })
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(data.error?.message || 'Error en IA');

    const botContent = data.choices[0].message.content;

    // 5. Guardar el intercambio en el historial de Supabase
    const { error: dbError } = await supabase
      .from('chat_history')
      .insert([
        { patient_id: patientId, role: 'user', message: userMessage },
        { patient_id: patientId, role: 'assistant', message: botContent }
      ]);

    if (dbError) console.error("Error DB al guardar:", dbError.message);

    res.status(200).json({ message: botContent });

  } catch (error) {
    console.error("Error en API Chat:", error.message);
    res.status(500).json({ error: error.message });
  }
}