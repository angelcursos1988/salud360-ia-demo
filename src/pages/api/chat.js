import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { userMessage, patientId, systemPrompt } = req.body;
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "Falta API KEY" });

  const isGreeting = userMessage === "[SALUDO_INICIAL_SISTEMA]";
  const masterRules = `Eres Salud360. Sé breve. Si hay datos biométricos usa [UPDATE:weight=valor,sleep_hours=valor,stress_level=valor].`;

  try {
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [{ role: "system", content: masterRules + "\n" + (systemPrompt || "") },
                   { role: "user", content: isGreeting ? "Hola, preséntate brevemente." : userMessage }],
        temperature: 0.5
      })
    });
    const data = await aiResponse.json();
    const botContent = data.choices[0].message.content;
    if (patientId) await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'assistant', message: botContent }]);
    res.status(200).json({ message: botContent });
  } catch (error) { res.status(500).json({ error: error.message }); }
}