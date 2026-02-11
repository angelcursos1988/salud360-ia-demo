import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Por favor, introduce tu nombre.");
      return;
    }

    setLoading(true);
    try {
      // 1. Insertar el paciente
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([{ name: name.trim() }])
        .select()
        .single();

      if (patientError) throw patientError;

      // 2. Crear su avatar inicial (opcional, según tu lógica)
      await supabase
        .from('avatars')
        .insert([{ 
          patient_id: patientData.id, 
          health: 100, 
          happiness: 100 
        }]);

      // 3. Redirigir al chat
      router.push(`/chat?id=${patientData.id}`);
    } catch (error) {
      console.error("Error al iniciar:", error);
      alert("Hubo un error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', fontFamily: 'sans-serif',
      position: 'relative'
    }}>
      
      {/* --- BOTÓN ACCESO MÉDICOS (Esquina Superior Derecha) --- */}
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <Link href="/dashboard">
          <button style={btnSecondary}>👨‍⚕️ Acceso Médicos</button>
        </Link>
      </div>

      {/* --- LOGO --- */}
      <img 
        src="/logo.jpg" 
        alt="Logo Salud360" 
        style={{ width: '120px', height: '120px', borderRadius: '25px', marginBottom: '20px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} 
      />
      
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', width: '90%', maxWidth: '400px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '28px' }}>Salud360 IA</h1>
        <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Bienvenido. ¿Cómo te llamas?</p>
        
        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Introduce tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ padding: '14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', outlineColor: '#16a085' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '14px', 
              background: loading ? '#95a5a6' : '#16a085', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              fontSize: '16px',
              transition: 'background 0.3s'
            }}
          >
            {loading ? 'Iniciando...' : 'Comenzar Consulta'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos extra
const btnSecondary = {
  padding: '10px 18px',
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  color: '#2c3e50',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};