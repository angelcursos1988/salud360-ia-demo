import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Asegúrate que esta ruta es correcta según tu estructura

export default function Avatar({ patientId }) {
  const [avatar, setAvatar] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) loadAvatar();
  }, [patientId]);

  const loadAvatar = async () => {
    try {
      // 1. Intentar obtener avatar existente
      let { data: avatarData } = await supabase
        .from('avatars')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      // 2. Si no existe, crearlo automáticamente
      if (!avatarData) {
        const { data: newAvatar, error } = await supabase
          .from('avatars')
          .insert({
            patient_id: patientId,
            name: 'Mi Saludita'
          })
          .select()
          .single();
        
        if (error) throw error;
        avatarData = newAvatar;
      }

      setAvatar(avatarData);

      // 3. Obtener retos activos
      const { data: challengesData } = await supabase
        .from('avatar_challenges')
        .select('*')
        .eq('avatar_id', avatarData.id)
        .eq('status', 'active');

      setChallenges(challengesData || []);
    } catch (error) {
      console.error('Error cargando avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarEmoji = (health) => {
    if (health >= 80) return '😊'; // Feliz
    if (health >= 60) return '🙂'; // Bien
    if (health >= 40) return '😐'; // Regular
    return '😢'; // Mal
  };

  const completeChallenge = async (challengeId) => {
    try {
      // Marcar reto como completado
      await supabase
        .from('avatar_challenges')
        .update({ status: 'completed', current_value: 100 })
        .eq('id', challengeId);

      // Subir salud del avatar como recompensa (+10)
      const newHealth = Math.min((avatar.health || 0) + 10, 100);
      
      await supabase
        .from('avatars')
        .update({ health: newHealth })
        .eq('id', avatar.id);

      // Recargar datos para ver los cambios
      loadAvatar();
    } catch (error) {
      console.error('Error completando reto:', error);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>⏳ Cargando Avatar...</div>;

  return (
    <div style={{
      padding: '20px',
      background: '#f0f8ff',
      borderRadius: '10px',
      textAlign: 'center',
      height: '100%',
      borderLeft: '1px solid #ddd'
    }}>
      {/* --- AVATAR VISUAL --- */}
      <div style={{
        fontSize: '100px',
        marginBottom: '20px',
        animation: 'bounce 2s infinite',
        cursor: 'default'
      }}>
        {getAvatarEmoji(avatar?.health || 100)}
      </div>

      <h2 style={{ color: '#2c3e50' }}>{avatar?.name}</h2>
      <p style={{ color: '#7f8c8d' }}>Nivel: {avatar?.level || 1}</p>

      {/* --- BARRAS DE ESTADO --- */}
      <div style={{ marginBottom: '20px', textAlign: 'left' }}>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>❤️ Salud: {avatar?.health}%</p>
        <div style={{
          background: '#ddd',
          borderRadius: '10px',
          overflow: 'hidden',
          height: '15px'
        }}>
          <div style={{
            background: '#e74c3c',
            height: '100%',
            width: `${avatar?.health}%`,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      <div style={{ marginBottom: '30px', textAlign: 'left' }}>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>😊 Felicidad: {avatar?.happiness}%</p>
        <div style={{
          background: '#ddd',
          borderRadius: '10px',
          overflow: 'hidden',
          height: '15px'
        }}>
          <div style={{
            background: '#f39c12',
            height: '100%',
            width: `${avatar?.happiness}%`,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* --- LISTA DE RETOS --- */}
      <div style={{ textAlign: 'left', marginTop: '20px', background: 'white', padding: '10px', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>🎯 Retos Activos</h3>
        
        {challenges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <p style={{ color: '#999', fontSize: '14px' }}>¡Estás al día!</p>
            {/* Botón temporal para crear retos y probar */}
            <button onClick={() => loadAvatar()} style={{ fontSize: '12px', color: '#3498db', background:'none', border:'none', cursor:'pointer' }}>
              (Refrescar)
            </button>
          </div>
        ) : (
          challenges.map(challenge => (
            <div key={challenge.id} style={{
              background: '#f9f9f9',
              padding: '10px',
              marginBottom: '8px',
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '14px'
            }}>
              <div>
                <strong style={{ display: 'block' }}>
                  {challenge.challenge_type === 'sleep' && '🛏️ Sueño'}
                  {challenge.challenge_type === 'exercise' && '🏃 Ejercicio'}
                  {challenge.challenge_type === 'nutrition' && '🥗 Nutrición'}
                </strong>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Meta: {challenge.target_value}
                </span>
              </div>
              <button
                onClick={() => completeChallenge(challenge.id)}
                style={{
                  padding: '5px 10px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
                title="Completar reto"
              >
                ✅
              </button>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}