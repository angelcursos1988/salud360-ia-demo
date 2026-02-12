import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [step, setStep] = useState('login'); // 'login', 'onboarding', 'checkin'
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Estado para los datos del formulario
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: '',
    gender: 'otro',
    activity_level: 'sedentario',
    sleep_hours: '',
    daily_steps: '',
    health_goal: 'estar saludable'
  });

  // 1. Verificar si el usuario existe
  const handleCheckUser = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      let { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('name', name.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (patient) {
        // USUARIO EXISTE -> Vamos al Check-in diario
        setPatientId(patient.id);
        // Pre-cargamos sus datos estáticos, pero dejamos vacíos los dinámicos para que los actualice
        setFormData({
          ...formData,
          age: patient.age || '',
          height: patient.height || '',
          weight: patient.weight || '', // Dejamos el peso anterior como referencia
          gender: patient.gender || 'otro',
          activity_level: patient.activity_level || 'sedentario',
          health_goal: patient.health_goal || 'estar saludable',
          sleep_hours: '', // Estos los pedimos frescos
          daily_steps: ''
        });
        setStep('checkin');
      } else {
        // USUARIO NUEVO -> Vamos al Onboarding completo
        setStep('onboarding');
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al buscar usuario");
    } finally {
      setLoading(false);
    }
  };

  // 2. Guardar datos (Crear nuevo o Actualizar existente)
  const handleSaveData = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let currentId = patientId;

      if (step === 'onboarding') {
        // CREAR NUEVO PACIENTE
        const { data: newPatient, error } = await supabase
          .from('patients')
          .insert([{
            name: name.trim(),
            ...formData
          }])
          .select()
          .single();
        
        if (error) throw error;
        currentId = newPatient.id;

      } else {
        // ACTUALIZAR PACIENTE EXISTENTE
        const { error } = await supabase
          .from('patients')
          .update({
            weight: formData.weight, // Actualizamos peso
            sleep_hours: formData.sleep_hours,
            daily_steps: formData.daily_steps,
            activity_level: formData.activity_level
            // No actualizamos edad o altura en el check-in diario para hacerlo rápido
          })
          .eq('id', patientId);

        if (error) throw error;
      }

      // Ir al chat
      router.push(`/chat?id=${currentId}`);

    } catch (error) {
      console.error("Error guardando datos:", error);
      alert("Error al guardar tus datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- ESTILOS ---
  const containerStyle = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: '#f4f7f6', fontFamily: 'sans-serif'
  };
  const cardStyle = {
    background: 'white', padding: '40px', borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '90%', maxWidth: '450px', textAlign: 'center'
  };
  const inputStyle = {
    width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '15px'
  };
  const labelStyle = { display: 'block', textAlign: 'left', marginBottom: '5px', color: '#555', fontSize: '14px', fontWeight: 'bold' };
  const btnStyle = {
    width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
    background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <img src="/logo.jpg" alt="Salud360" style={{ width: '60px', marginBottom: '15px', borderRadius: '10px' }} />
        
        {step === 'login' && (
          <>
            <h1 style={{ color: '#2c3e50' }}>Bienvenido</h1>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>Introduce tu nombre para empezar.</p>
            <form onSubmit={handleCheckUser}>
              <input 
                style={inputStyle} type="text" placeholder="Tu nombre completo" 
                value={name} onChange={(e) => setName(e.target.value)} required 
              />
              <button style={btnStyle} disabled={loading}>{loading ? 'Cargando...' : 'Continuar'}</button>
            </form>
            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#7f8c8d', cursor: 'pointer', fontSize: '13px' }}>
                Acceso Médicos
              </button>
            </div>
          </>
        )}

        {step === 'onboarding' && (
          <form onSubmit={handleSaveData} style={{ textAlign: 'left' }}>
            <h2 style={{ color: '#2c3e50', textAlign: 'center' }}>Perfil Inicial</h2>
            <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', marginBottom: '20px' }}>Necesitamos estos datos para personalizar tu plan.</p>
            
            <label style={labelStyle}>Edad</label>
            <input name="age" type="number" placeholder="Años" style={inputStyle} onChange={handleInputChange} required />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Peso (kg)</label>
                <input name="weight" type="number" step="0.1" placeholder="Ej: 70.5" style={inputStyle} onChange={handleInputChange} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Altura (cm)</label>
                <input name="height" type="number" placeholder="Ej: 175" style={inputStyle} onChange={handleInputChange} required />
              </div>
            </div>

            <label style={labelStyle}>Género</label>
            <select name="gender" style={inputStyle} onChange={handleInputChange}>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
              <option value="otro">Otro</option>
            </select>

            <label style={labelStyle}>Objetivo</label>
            <select name="health_goal" style={inputStyle} onChange={handleInputChange}>
              <option value="estar saludable">Estar más saludable</option>
              <option value="perder peso">Perder peso</option>
              <option value="ganar musculo">Ganar masa muscular</option>
              <option value="reducir estres">Reducir estrés</option>
            </select>

            <button style={btnStyle} disabled={loading}>Crear Perfil e Ir al Chat</button>
          </form>
        )}

        {step === 'checkin' && (
          <form onSubmit={handleSaveData} style={{ textAlign: 'left' }}>
            <h2 style={{ color: '#2c3e50', textAlign: 'center' }}>¡Hola de nuevo, {name}!</h2>
            <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', marginBottom: '20px' }}>Actualiza tus datos de hoy para ajustar el plan.</p>
            
            <label style={labelStyle}>¿Peso actual? (kg)</label>
            <input name="weight" type="number" step="0.1" value={formData.weight} style={inputStyle} onChange={handleInputChange} />

            <label style={labelStyle}>¿Horas de sueño anoche?</label>
            <input name="sleep_hours" type="number" placeholder="Ej: 7" style={inputStyle} onChange={handleInputChange} />

            <label style={labelStyle}>¿Pasos ayer/hoy?</label>
            <input name="daily_steps" type="number" placeholder="Ej: 8000" style={inputStyle} onChange={handleInputChange} />

            <button style={btnStyle} disabled={loading}>Actualizar y Continuar</button>
          </form>
        )}
      </div>
    </div>
  );
}