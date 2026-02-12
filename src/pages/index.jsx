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
        // Pre-cargamos los datos existentes para el check-in diario
        setFormData({
          age: patient.age || '',
          height: patient.height || '',
          diet_type: patient.diet_type || 'omnivoro',
          health_goal: patient.health_goal || 'estar saludable',
          weight: '', // Forzamos a que ingrese el peso de hoy
          sleep_hours: '', 
          stress_level: '5',
          allergies: patient.allergies || '',
          medical_conditions: patient.medical_conditions || ''
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

      // 1. Preparación de datos (Limpieza y tipos correctos)
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

      // 2. Operación principal en tabla 'patients'
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

      // 3. GUARDADO EN HISTORIAL (Vital para las gráficas del Dashboard)
      // Guardamos la foto del estado actual del paciente en la tabla de logs
      try {
        const { error: logError } = await supabase.from('health_logs').insert([{
          patient_id: currentId,
          weight: parseFloat(formData.weight) || 0,
          stress_level: parseInt(formData.stress_level) || 5,
          sleep_hours: parseInt(formData.sleep_hours) || 0
        }]);
        
        if (logError) console.error("Error en log:", logError);
      } catch (logErr) {
        console.warn("Error guardando historial:", logErr);
      }

      // 4. Navegar al Chat pasando el ID
      router.push(`/chat?id=${currentId}`);

    } catch (error) {
      console.error("Error crítico al guardar:", error);
      alert("Hubo un error al guardar los datos: " + (error.message || "Error de conexión"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Diseño visual
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
              <p style={{ color: '#64748b', fontSize: '14px' }}>Tu asistente de salud inteligente</p>
            </div>
            <input style={inputStyle} type="text" placeholder="Tu nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
            <button style={btnStyle}>{loading ? 'Cargando...' : 'Entrar'}</button>
            <p onClick={() => router.push('/dashboard')} style={{ textAlign: 'center', color: '#64748b', cursor: 'pointer', marginTop: '25px', fontSize: '13px', fontWeight: '500' }}>Acceso facultativos →</p>
          </form>
        )}

        {(step === 'onboarding' || step === 'checkin') && (
          <form onSubmit={handleSaveData}>
            <h2 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '20px' }}>
              {step === 'onboarding' ? 'Crear Perfil' : 'Check-in Diario'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>Ayúdanos a actualizar tus métricas.</p>
            
            <label style={{fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px'}}>Peso Actual (kg)</label>
            <input name="weight" type="number" step="0.1" style={inputStyle} value={formData.weight} onChange={handleInputChange} required />
            
            <label style={{fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px'}}>Nivel de Estrés: {formData.stress_level}/10</label>
            <input name="stress_level" type="range" min="1" max="10" style={{...inputStyle, padding: '5px'}} value={formData.stress_level} onChange={handleInputChange} />
            
            <label style={{fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px'}}>Horas de sueño</label>
            <input name="sleep_hours" type="number" style={inputStyle} value={formData.sleep_hours} onChange={handleInputChange} required />

            {step === 'onboarding' && (
              <>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input name="age" type="number" placeholder="Edad" style={inputStyle} onChange={handleInputChange} required />
                  <input name="height" type="number" placeholder="Altura (cm)" style={inputStyle} onChange={handleInputChange} required />
                </div>
                <select name="diet_type" style={inputStyle} onChange={handleInputChange}>
                  <option value="omnivoro">Omnívoro</option>
                  <option value="vegetariano">Vegetariano</option>
                  <option value="vegano">Vegano</option>
                  <option value="keto">Keto</option>
                </select>
              </>
            )}

            <button style={btnStyle}>{loading ? 'Guardando...' : 'Confirmar Datos'}</button>
            <p onClick={() => setStep('login')} style={{ textAlign: 'center', color: '#94a3b8', cursor: 'pointer', marginTop: '15px', fontSize: '12px' }}>Atrás</p>
          </form>
        )}
      </div>
    </div>
  );
}