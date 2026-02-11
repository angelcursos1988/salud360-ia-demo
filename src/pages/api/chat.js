import chatWithGemini from '../../lib/claude';
import { saveMessage, getChatHistory } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { patientId, userMessage } = req.body;

    if (!patientId || !userMessage) {
      return res.status(400).json({ error: 'Falta patientId o userMessage' });
    }

    // Guardar mensaje del usuario en Supabase
    await saveMessage(patientId, 'user', userMessage);
    
    // Obtener historial
    const history = await getChatHistory(patientId);
    
    // 2. CAMBIO AQUÍ: Llamamos a Gemini en lugar de Claude
    const assistantMessage = await chatWithGemini(history);
    
    // Guardar respuesta de la IA en Supabase
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