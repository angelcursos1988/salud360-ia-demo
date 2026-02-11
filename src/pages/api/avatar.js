import { supabase } from '../../lib/supabase'; // Asegúrate de que la ruta a lib/supabase es correcta

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { patientId, action, challengeId, type } = req.body;

    try {
      // Acción 1: Crear un nuevo reto (Ej: La IA detecta que duermes mal y te pone un reto)
      if (action === 'create_challenge') {
        const { data: avatar } = await supabase
          .from('avatars')
          .select('id')
          .eq('patient_id', patientId)
          .single();

        if (!avatar) return res.status(404).json({ error: 'Avatar no encontrado' });

        const { data: challenge, error } = await supabase
          .from('avatar_challenges')
          .insert({
            avatar_id: avatar.id,
            challenge_type: type || 'generic',
            target_value: 10,
            reward_points: 50,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Mañana
          })
          .select();

        if (error) throw error;
        return res.status(200).json(challenge[0]);
      }

      // Acción 2: Completar un reto
      if (action === 'complete_challenge') {
        await supabase
          .from('avatar_challenges')
          .update({ status: 'completed' })
          .eq('id', challengeId);

        return res.status(200).json({ success: true });
      }
    } catch (error) {
      console.error('Error API Avatar:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}