import { chatWithClaude } from '../../lib/claude';
import { saveMessage, getChatHistory } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { patientId, userMessage } = req.body;

    if (!patientId || !userMessage) {
      return res.status(400).json({
        error: 'Falta patientId o userMessage'
      });
    }

    await saveMessage(patientId, 'user', userMessage);
    const history = await getChatHistory(patientId);
    const assistantMessage = await chatWithClaude(history);
    await saveMessage(patientId, 'assistant', assistantMessage);

    res.status(200).json({
      success: true,
      message: assistantMessage
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message || 'Error interno'
    });
  }
}