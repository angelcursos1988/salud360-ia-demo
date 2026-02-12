import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [step, setStep] = useState('login'); 
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    age: '', height: '', diet_type: 'omnivoro',
    health_goal: 'estar saludable', weight: '', sleep_hours: '',
    stress_level: '5', allergies: '', medical_conditions: ''
  });

  const handleCheckUser = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      let { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('name', name.trim())
        .maybeSingle();

      if (patient) {
        setPatientId(patient.id);
        // Pre-cargamos los datos que ya tenemos del paciente
        setFormData(prev => ({ ...prev, ...patient }));
        setStep('checkin');
      } else {
        setStep('onboarding');
      }
    } catch (error) {
      console.error("Error al buscar usuario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let currentId = patientId;

      // 1. Limpieza de datos antes de enviar a Supabase
      const dataToSave = {
        name: name.trim(),
        age: parseInt(formData.age) || 0,
        height: parseInt(formData.height) || 0,
        weight: parseFloat(formData.weight) || 0,
        sleep_hours: parseInt(formData.sleep_hours) || 0,
        stress_level: parseInt(formData.stress_level) || 5,
        diet_type: formData.diet_type || 'omnivoro',
        health_goal: formData.health_goal || 'bienestar',
        allergies: formData.allergies || '',
        medical_conditions: formData.medical_conditions || '',
        updated_at: new Date().toISOString()
      };

      // 2. Guardar o Actualizar Perfil Principal
      if (step === 'onboarding') {
        const { data: newP, error: insertError } = await supabase
          .from('patients')
          .insert([dataToSave])
          .select()
          .single();
        
        if (insertError) throw insertError;
        currentId = newP.id;
      } else {
        const { error: updateError } = await supabase
          .from('patients')
          .update(dataToSave)
          .eq('id', patientId);
        
        if (updateError) throw updateError;
      }

      // 3. Guardar en Histórico (Health Logs)
      // Lo envolvemos en otro try/catch para que si esto falla, no bloquee el acceso al chat
      try {
        await supabase.from('health_logs').insert([{
          patient_id: currentId,
          weight: parseFloat(formData.weight) || 0,
          stress_level: parseInt(formData.stress_level) || 5,
          sleep_hours: parseInt(formData.sleep_hours) || 0
        }]);
      } catch (logErr) {
        console.warn("Error guardando historial (no crítico):", logErr);
      }

      // 4. Navegar al Chat
      router.push(`/chat?id=${currentId}`);

    } catch (error) {
      console.error("Error crítico al guardar:", error);
      alert("Lo sentimos, hubo un problema: " + (error.message || "Error de conexión"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Estilos visuales consistentes con la Opción C
  const cardStyle = { background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px' };
  const inputStyle = { width: '100%', padding: '14px', marginBottom: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc' };
  const btnStyle = { width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 10px rgba(39, 174, 96, 0.2)' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={cardStyle}>
        {step === 'login' && (
          <form onSubmit={handleCheckUser}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ width: '60px', height: '60px', background: '#27ae60', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px', margin: '0 auto 15px' }}>S360</div>
              <h1 style={{ color: '#1e293b', margin: 0, fontSize: '24px' }}>Salud360</h1>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Tu asistente de nutrición inteligente</p>
            </div>
            <input style={inputStyle} type="text" placeholder="Introduce tu nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
            <button style={btnStyle}>{loading ? 'Iniciando sesión...' : 'Entrar'}</button>
            <p onClick={() => router.push('/dashboard')} style={{ textAlign: 'center', color: '#64748b', cursor: 'pointer', marginTop: '25px', fontSize: '13px', fontWeight: '500' }}>Acceso exclusivo facultativos →</p>
          </form>
        )}

        {(step === 'onboarding' || step === 'checkin') && (
          <form onSubmit={handleSaveData}>
            <h2 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '20px' }}>{step === 'onboarding' ? 'Crear tu perfil médico' : 'Actualización diaria'}</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>Cuéntanos cómo te encuentras hoy.</p>
            
            <label style={{fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px'}}>Peso Actual (kg)</label>
            <input name="weight" type="number" step="0.1" style={inputStyle} value={formData.weight} onChange={handleInputChange} required />
            
            <label style={{fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px'}}>Nivel de Estrés ({formData.stress_level}/10)</label>
            <input name="stress_level" type="range" min="1" max="10" style={{...inputStyle, padding: '5px'}} value={formData.stress_level} onChange={handleInputChange} />
            
            <label style={{fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px'}}>Horas de sueño anoche</label>
            <input name="sleep_hours" type="number" style={inputStyle} value={formData.sleep_hours} onChange={handleInputChange} required />

            {step === 'onboarding' && (
              <>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input name="age" type="number" placeholder="Edad" style={inputStyle} onChange={handleInputChange} required />
                  <input name="height" type="number" placeholder="Altura cm" style={inputStyle} onChange={handleInputChange} required />
                </div>
                <select name="diet_type" style={inputStyle} onChange={handleInputChange}>
                  <option value="omnivoro">Dieta: Omnívoro</option>
                  <option value="vegetariano">Dieta: Vegetariano</option>
                  <option value="vegano">Dieta: Vegano</option>
                  <option value="keto">Dieta: Keto</option>
                </select>
              </>
            )}

            <button style={btnStyle}>{loading ? 'Procesando datos...' : 'Confirmar y Entrar al Chat'}</button>
            <p onClick={() => setStep('login')} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer', marginTop: '15px', fontSize: '13px' }}>Cancelar</p>
          </form>
        )}
      </div>
    </div>
  );
}