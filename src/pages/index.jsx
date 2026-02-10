import { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(false);

  const createPatient = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({ name: patientName })
        .select();

      if (error) throw error;

      setPatientId(data[0].id);
      setShowChat(true);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showChat && patientId) {
    return <ChatWindow patientId={patientId} />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>🏥 Salud360 IA</h1>
        <p style={{ fontSize: '18px', marginBottom: '40px' }}>
          Pre-diagnóstico inteligente con IA
        </p>

        <form onSubmit={createPatient} style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '30px',
          borderRadius: '10px',
          backdropFilter: 'blur(10px)'
        }}>
          <label style={{ display: 'block', marginBottom: '10px', textAlign: 'left' }}>
            Tu nombre:
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Ej: Juan García"
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '20px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#fff',
              color: '#1abc9c',
              border: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Creando...' : '✨ Iniciar Chat'}
          </button>
        </form>

        <p style={{ marginTop: '30px', fontSize: '12px', opacity: 0.8 }}>
          Tu información está completamente segura
        </p>
      </div>
    </div>
  );
}