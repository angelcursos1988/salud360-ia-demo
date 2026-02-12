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
    age: '', 
    height: '', 
    weight: '', 
    sleep_hours: '',
    stress_level: '5', 
    diet_type: 'omnivoro',
    gender: 'otro', // Nuevo
    activity: 'moderado', // Nuevo
    health_goal: 'estar saludable', 
    allergies: '', 
    medical_conditions: ''
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
        // Pre-cargamos los datos estáticos que ya conocemos
        setFormData({
          ...formData,
          age: patient.age || '',
          height: patient.height || '',
          gender: patient.gender || 'otro',
          activity: patient.activity || 'moderado',
          diet_type: patient.diet_type || 'omnivoro',
          health_goal: patient.health_goal || 'estar saludable',
          weight: '', // Vacío para obligar a actualizar hoy
          sleep_hours: '', 
          stress_level: '5',
        });
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

      const dataToSave = {
        name: name.trim(),
        age: parseInt(formData.age) || 0,
        height: parseInt(formData.height) || 0,
        weight: parseFloat(formData.weight) || 0,
        sleep_hours: parseInt(formData.sleep_hours) || 0,
        stress_level: parseInt(formData.stress_level) || 5,
        diet_type: formData.diet_type || 'omnivoro',
        gender: formData.gender, // Nuevo
        activity: formData.activity, // Nuevo
        health_goal: formData.health_goal || 'bienestar',
        allergies: formData.allergies || '',
        medical_conditions: formData.medical_conditions || '',
        updated_at: new Date().toISOString()
      };

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

      // Guardado en Historial para gráficas
      try {
        await supabase.from('health_logs').insert([{
          patient_id: currentId,
          weight: parseFloat(formData.weight) || 0,
          stress_level: parseInt(formData.stress_level) || 5,
          sleep_hours: parseInt(formData.sleep_hours) || 0
        }]);
      } catch (logErr) {
        console.warn("Error en historial:", logErr);
      }

      router.push(`/chat?id=${currentId}`);
    } catch (error) {
      console.error("Error crítico:", error);
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const cardStyle = { background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px' };
  const inputStyle = { width: '100%', padding: '14px', marginBottom: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc' };
  const btnStyle = { width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 10px rgba(39, 174, 96, 0.2)' };
  const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={cardStyle}>
        {step === 'login' && (
          <form onSubmit={handleCheckUser}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ width: '60px', height: '60px', background: '#27ae60', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px', margin: '0 auto 15px' }}>S360</div>
              <h1 style={{ color: '#1e293b', margin: 0, fontSize: '24px' }}>Salud360</h1>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Tu asistente de salud inteligente</p>
            </div>
            <input style={inputStyle} type="text" placeholder="Tu nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
            <button style={btnStyle}>{loading ? 'Verificando...' : 'Entrar'}</button>
            <p onClick={() => router.push('/dashboard')} style={{ textAlign: 'center', color: '#64748b', cursor: 'pointer', marginTop: '25px', fontSize: '13px', fontWeight: '500' }}>Acceso facultativos →</p>
          </form>
        )}

        {(step === 'onboarding' || step === 'checkin') && (
          <form onSubmit={handleSaveData}>
            <h2 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '20px' }}>
              {step === 'onboarding' ? 'Crear Perfil Médico' : 'Check-in de hoy'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>
              {step === 'onboarding' ? 'Necesitamos tus datos base.' : 'Actualiza tus métricas diarias.'}
            </p>
            
            <label style={labelStyle}>Peso Actual (kg)</label>
            <input name="weight" type="number" step="0.1" style={inputStyle} value={formData.weight} onChange={handleInputChange} required />
            
            <label style={labelStyle}>Nivel de Estrés: {formData.stress_level}/10</label>
            <input name="stress_level" type="range" min="1" max="10" style={{...inputStyle, padding: '5px'}} value={formData.stress_level} onChange={handleInputChange} />
            
            <label style={labelStyle}>Horas de sueño</label>
            <input name="sleep_hours" type="number" style={inputStyle} value={formData.sleep_hours} onChange={handleInputChange} required />

            {step === 'onboarding' && (
              <>
                <div style={{display: 'flex', gap: '10px'}}>
                  <div style={{flex: 1}}>
                    <label style={labelStyle}>Edad</label>
                    <input name="age" type="number" style={inputStyle} onChange={handleInputChange} required />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={labelStyle}>Altura (cm)</label>
                    <input name="height" type="number" style={inputStyle} onChange={handleInputChange} required />
                  </div>
                </div>

                <label style={labelStyle}>Sexo biológico</label>
                <select name="gender" style={inputStyle} onChange={handleInputChange} value={formData.gender}>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                  <option value="otro">Otro / Prefiero no decir</option>
                </select>

                <label style={labelStyle}>Nivel de actividad</label>
                <select name="activity" style={inputStyle} onChange={handleInputChange} value={formData.activity}>
                  <option value="sedentario">Sedentario (Poco ejercicio)</option>
                  <option value="moderado">Moderado (3 veces/semana)</option>
                  <option value="activo">Activo (Diario)</option>
                  <option value="atleta">Atleta / Alto Rendimiento</option>
                </select>

                <label style={labelStyle}>Tipo de dieta</label>
                <select name="diet_type" style={inputStyle} onChange={handleInputChange} value={formData.diet_type}>
                  <option value="omnivoro">Omnívoro</option>
                  <option value="vegetariano">Vegetariano</option>
                  <option value="vegano">Vegano</option>
                  <option value="keto">Keto</option>
                </select>
              </>
            )}

            <button style={btnStyle}>{loading ? 'Guardando...' : 'Confirmar y Entrar'}</button>
            <p onClick={() => setStep('login')} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer', marginTop: '15px', fontSize: '12px' }}>Atrás</p>
          </form>
        )}
      </div>
    </div>
  );
}