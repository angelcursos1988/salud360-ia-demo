import { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import Avatar from '../components/Avatar'; 
import { supabase } from '../lib/supabase'; 

export default function Home() {
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({ name: patientName })
        .select()
        .single();

      if (error) throw error;

      setPatientId(data.id);
      setShowChat(true);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // VISTA DEL CHAT + AVATAR (Split Screen)
  if (showChat && patientId) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 350px', 
        height: '100vh',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ height: '100%', borderRight: '1px solid #ccc' }}>
          <ChatWindow patientId={patientId} />
        </div>
        <div style={{ height: '100%', background: '#f8f9fa' }}>
          <Avatar patientId={patientId} />
        </div>
      </div>
    );
  }

  // VISTA DE LOGIN CON ACCESO MÉDICO
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>🏥 Salud360 IA</h1>
        <p style={{ fontSize: '18px', marginBottom: '40px' }}>
          Tu asistente de salud con IA y Avatar
        </p>

        <form onSubmit={handleStart} style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '30px',
          borderRadius: '15px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <label style={{ display: 'block', marginBottom: '10px', textAlign: 'left', fontWeight:'bold' }}>
            ¿Cómo te llamas?
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Ej: Ana García"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#333'
            }}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'white',
              color: '#16a085',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? '⏳ Iniciando...' : '✨ Entrar'}
          </button>
        </form>
      </div>

      {/* Acceso para Médicos al Dashboard */}
      <div style={{ marginTop: '30px', opacity: 0.6 }}>
        <a href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid white' }}>
          👨‍⚕️ Acceso Panel Médico
        </a>
      </div>
      
    </div>
  );
}