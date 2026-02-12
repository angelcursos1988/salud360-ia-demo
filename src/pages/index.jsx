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
    age: '', height: '', gender: 'otro', diet_type: 'omnivoro',
    allergies: '', medical_conditions: '', activity_type: 'sedentario',
    health_goal: 'estar saludable', weight: '', sleep_hours: '',
    daily_water: '4', stress_level: '5', mood: 'normal', digestion: 'normal'
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
        setFormData(prev => ({ ...prev, ...patient }));
        setStep('checkin');
      } else {
        setStep('onboarding');
      }
    } catch (error) {
      console.error("Error:", error);
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
        name: name.trim(), ...formData,
        age: parseInt(formData.age), height: parseInt(formData.height),
        weight: parseFloat(formData.weight), sleep_hours: parseInt(formData.sleep_hours),
        daily_water: parseInt(formData.daily_water), stress_level: parseInt(formData.stress_level),
        updated_at: new Date().toISOString()
      };

      if (step === 'onboarding') {
        const { data: newP, error } = await supabase.from('patients').insert([dataToSave]).select().single();
        if (error) throw error;
        currentId = newP.id;
      } else {
        await supabase.from('patients').update(dataToSave).eq('id', patientId);
      }

      // GUARDAR EN EL HISTÓRICO (health_logs)
      await supabase.from('health_logs').insert([{
        patient_id: currentId,
        weight: parseFloat(formData.weight),
        stress_level: parseInt(formData.stress_level),
        sleep_hours: parseInt(formData.sleep_hours)
      }]);

      router.push(`/chat?id=${currentId}`);
    } catch (error) {
      alert("Error al guardar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Estilos rápidos
  const cardStyle = { background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px' };
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' };
  const btnStyle = { width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={cardStyle}>
        {step === 'login' && (
          <form onSubmit={handleCheckUser}>
            <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>Salud360</h1>
            <input style={inputStyle} type="text" placeholder="Introduce tu nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            <button style={btnStyle}>{loading ? 'Cargando...' : 'Entrar'}</button>
            <p onClick={() => router.push('/dashboard')} style={{ textAlign: 'center', color: '#64748b', cursor: 'pointer', marginTop: '15px', fontSize: '14px' }}>Acceso Facultativos</p>
          </form>
        )}

        {(step === 'onboarding' || step === 'checkin') && (
          <form onSubmit={handleSaveData}>
            <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>{step === 'onboarding' ? 'Crear Perfil' : 'Check-in Diario'}</h2>
            
            <label style={{fontSize: '13px', fontWeight: 'bold'}}>Peso Actual (kg)</label>
            <input name="weight" type="number" step="0.1" style={inputStyle} value={formData.weight} onChange={handleInputChange} required />
            
            <label style={{fontSize: '13px', fontWeight: 'bold'}}>Estrés (1-10)</label>
            <input name="stress_level" type="range" min="1" max="10" style={inputStyle} value={formData.stress_level} onChange={handleInputChange} />
            
            <label style={{fontSize: '13px', fontWeight: 'bold'}}>Horas de sueño</label>
            <input name="sleep_hours" type="number" style={inputStyle} value={formData.sleep_hours} onChange={handleInputChange} required />

            {step === 'onboarding' && (
              <>
                <input name="age" type="number" placeholder="Edad" style={inputStyle} onChange={handleInputChange} required />
                <input name="height" type="number" placeholder="Altura (cm)" style={inputStyle} onChange={handleInputChange} required />
                <select name="diet_type" style={inputStyle} onChange={handleInputChange}>
                  <option value="omnivoro">Omnívoro</option>
                  <option value="vegetariano">Vegetariano</option>
                  <option value="keto">Keto</option>
                </select>
              </>
            )}

            <button style={btnStyle}>{loading ? 'Guardando...' : 'Confirmar y Continuar'}</button>
          </form>
        )}
      </div>
    </div>
  );
}