import { createClient } from '@supabase/supabase-js';
import { analyzePatient} from '../../lib/ia/decisionEngine';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { userMessage, patientId, systemPrompt } = req.body;
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Falta API KEY" });

  const isGreeting = userMessage === "[SALUDO_INICIAL_SISTEMA]";
  const masterRules = `Eres Salud360. Sé breve. Si hay datos biométricos usa [UPDATE:weight=valor,sleep_hours=valor,stress_level=valor].`;

  try {
    const result = await analyzePatient(userMessage);

    const assistantText = (result && typeof result === 'object') ? (result.message || JSON.stringify(result)) : String(result);

    if (patientId) {
      await supabase.from('chat_history').insert([
        { patient_id: patientId, role: 'assistant', message: assistantText }
      ]);
    }

    res.status(200).json({ message: assistantText, data: result });
  } catch (error) {
    // console.error("ERROR IA:", error);
    res.status(500).json({ error: error.message });
  }
}