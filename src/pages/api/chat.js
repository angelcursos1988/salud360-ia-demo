import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { userMessage, patientId, systemPrompt: patientContext } = req.body;

  // NUEVAS REGLAS MAESTRAS: "Modo Nutricionista Experto"
  const masterRules = `Eres el Especialista Principal de Salud360. Tu misión es ser un asistente de salud altamente accionable y experto.

  INSTRUCCIONES CRÍTICAS:
  1. ANALIZA Y PERSONALIZA: Usa SIEMPRE los datos del paciente (Peso, Actividad, Dieta, Estrés) para que tus consejos no sean genéricos.
  2. PROPORCIONA CONTENIDO DETALLADO: Si el usuario te pide un menú semanal, una receta o un plan de ejercicios, DEBES proporcionarlo con detalle. Usa tablas o listas de Markdown para que sea legible. No pongas excusas sobre "no poder dar menús".
  3. EDUCA CON CIENCIA: Explica brevemente por qué recomiendas algo basado en sus biométricas (ej: "Debido a tu nivel de actividad sedentario, priorizaremos proteínas magras...").
  4. FORMATO DE RETO: Al final de cada interacción, asigna OBLIGATORIAMENTE un reto usando exactamente el formato: [RETO: Nombre del Reto].

  TONO Y ESTILO:
  - Autoritario, profesional y muy motivador.
  - No uses frases introductorias largas como "Como IA no puedo...". Ve al grano.
  - Usa negritas para resaltar puntos clave.

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
        temperature: 0.7, // Mantiene un equilibrio entre creatividad y precisión médica
        max_tokens: 1000  // Aumentamos a 1000 para que los menús no se corten
      })
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(data.error?.message || 'Error en IA');

    const botContent = data.choices[0].message.content;

    // Guardar en historial de Supabase
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