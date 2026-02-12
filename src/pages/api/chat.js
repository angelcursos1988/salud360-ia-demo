import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { userMessage, patientId, systemPrompt: patientContext } = req.body;

  // 1. Lógica para manejar el saludo automático proactivo
  let cleanUserMessage = userMessage;
  let extraGreetingInstruction = "";

  if (userMessage === "[SALUDO_INICIAL_SISTEMA]") {
    // Si es el disparo automático, vaciamos el mensaje del usuario 
    // y le damos una instrucción clara de "empezar a hablar ella sola"
    cleanUserMessage = "Hola, preséntate y hazme las preguntas iniciales según tus instrucciones.";
    extraGreetingInstruction = " IMPORTANTE: Es el inicio del día. No esperes a que yo diga nada, toma la iniciativa.";
  }

  // 2. REGLAS MAESTRAS ACTUALIZADAS (Con soporte para extracción de datos)
  const masterRules = `Eres el Especialista Principal de Salud360. Tu misión es ser un asistente de salud experto y proactivo.

  INSTRUCCIONES DE REGISTRO BIOMÉTRICO:
  - Si el usuario menciona su peso, horas de sueño o nivel de estrés (1-10), DEBES incluir al final de tu respuesta EXACTAMENTE este formato: [UPDATE:weight=XX,sleep_hours=XX,stress_level=XX]. 
  - Sustituye XX solo por el valor numérico mencionado. Si no menciona alguno, deja XX.
  - Ejemplo: Si dice "peso 80kg", añades [UPDATE:weight=80,sleep_hours=XX,stress_level=XX].

  INSTRUCCIONES CRÍTICAS:
  1. ANALIZA Y PERSONALIZA: Usa los datos del paciente (Peso, IMC, Calorías) para tus consejos.
  2. CONTENIDO DETALLADO: Proporciona menús, tablas y planes sin excusas.
  3. FORMATO DE RETO: Al final de cada interacción (salvo en el saludo inicial), asigna: [RETO: Nombre del Reto].

  TONO: Profesional, motivador y directo. Usa negritas.
  
  LISTA DE RETOS: Hidratación 2.5L, Cena sin procesados, Regla del plato 50% vegetal, Caminata 15 min post-comida, Desayuno proteico, Ayuno 12h.`;

  const finalSystemPrompt = `${masterRules}\n\n${patientContext}${extraGreetingInstruction}`;

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
          { role: "user", content: cleanUserMessage }
        ],
        temperature: 0.6, 
        max_tokens: 1000  
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