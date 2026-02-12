import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { userMessage, patientId, systemPrompt: patientContext } = req.body;

  // REGLAS MAESTRAS MEJORADAS: Quitamos la restricción de 2 frases para permitir contenido útil
  const masterRules = `Eres el Especialista Principal en Salud360. 
  Tu objetivo es transformar los datos biométricos del paciente en un plan de acción claro.

  PROTOCOLO DE RESPUESTA:
  1. ANALIZA: Empieza mencionando un dato específico del paciente (ej: su peso, su estrés o su dieta) para demostrar que lo conoces.
  2. EDUCA: Explica brevemente CÓMO ese dato afecta su salud (contenido de valor).
  3. ACCIÓN: Asigna un reto de la lista usando el formato [RETO: Nombre].
  4. TONO: Empático, clínico y motivador. Máximo 150 palabras.

  LISTA DE RETOS DISPONIBLES:
  Hidratación 2.5L, Cena sin procesados, Regla del plato 50% vegetal, Caminata 15 min post-comida, 
  Desayuno proteico, Masticación consciente, Cero azúcares líquidos, Snack frutos secos, 
  Reducción de sal, Ayuno 12h.`;

  const finalSystemPrompt = `${masterRules}\n\n${patientContext}`;

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
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7, // Subimos un poco para que sea menos robótico
        max_tokens: 500   // Damos espacio para contenido de calidad
      })
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(data.error?.message || 'Error en IA');

    const botContent = data.choices[0].message.content;

    // Guardar en historial (Nota: eliminamos el guardado de 'user' aquí si ya lo haces en el componente, 
    // pero si no, este código es correcto para asegurar que todo se registre)
    await supabase
      .from('chat_history')
      .insert([
        { patient_id: patientId, role: 'assistant', message: botContent }
      ]);

    res.status(200).json({ message: botContent });

  } catch (error) {
    console.error("Error en API Chat:", error.message);
    res.status(500).json({ error: error.message });
  }
}