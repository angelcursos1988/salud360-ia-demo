import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [step, setStep] = useState('login'); // 'login', 'onboarding', 'checkin'
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Estado ampliado con datos clínicos y de estilo de vida
  const [formData, setFormData] = useState({
    // Perfil Fijo
    age: '',
    height: '',
    gender: 'otro',
    diet_type: 'omnivoro',
    allergies: '',
    medical_conditions: '',
    activity_type: 'sedentario',
    health_goal: 'estar saludable',
    
    // Check-in Diario
    weight: '',
    sleep_hours: '',
    daily_water: '4', // vasos por defecto
    stress_level: '5',
    mood: 'normal',
    digestion: 'normal'
  });

  // 1. Verificar usuario
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
        // Usuario existe: Vamos al Check-in diario
        setPatientId(patient.id);
        // Cargamos datos fijos, reseteamos los variables
        setFormData(prev => ({
          ...prev,
          age: patient.age || '',
          height: patient.height || '',
          gender: patient.gender || 'otro',
          diet_type: patient.diet_type || 'omnivoro',
          allergies: patient.allergies || '',
          medical_conditions: patient.medical_conditions || '',
          weight: patient.weight || '', // Peso anterior como referencia
        }));
        setStep('checkin');
      } else {
        setStep('onboarding');
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  // 2. Guardar datos
  const handleSaveData = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let currentId = patientId;
      const dataToSave = {
        name: name.trim(),
        ...formData,
        // Convertir números
        age: parseInt(formData.age),
        height: parseInt(formData.height),
        weight: parseFloat(formData.weight),
        sleep_hours: parseInt(formData.sleep_hours),
        daily_water: parseInt(formData.daily_water),
        stress_level: parseInt(formData.stress_level)
      };

      if (step === 'onboarding') {
        const { data: newPatient, error } = await supabase
          .from('patients')
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        currentId = newPatient.id;
      } else {
        const { error } = await supabase
          .from('patients')
          .update(dataToSave)
          .eq('id', patientId);
        if (error) throw error;
      }

      router.push(`/chat?id=${currentId}`);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- ESTILOS ---
  const containerStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', fontFamily: 'sans-serif', padding: '20px' };
  const cardStyle = { background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '500px' };
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e1e4e8', fontSize: '15px' };
  const labelStyle = { display: 'block', marginBottom: '6px', color: '#4a5568', fontSize: '13px', fontWeight: '600' };
  const sectionTitle = { fontSize: '16px', color: '#2d3748', fontWeight: 'bold', margin: '20px 0 10px', borderBottom: '2px solid #edf2f7', paddingBottom: '5px' };
  const btnStyle = { width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: '#3182ce', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', fontSize: '16px' };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
           <img src="/logo.jpg" alt="Salud360" style={{ width: '60px', borderRadius: '12px' }} />
        </div>

        {step === 'login' && (
          <>
            <h1 style={{ textAlign: 'center', color: '#1a202c' }}>Salud360</h1>
            <p style={{ textAlign: 'center', color: '#718096', marginBottom: '30px' }}>Tu asistente de salud personal</p>
            <form onSubmit={handleCheckUser}>
              <input style={inputStyle} type="text" placeholder="Tu nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
              <button style={btnStyle} disabled={loading}>{loading ? 'Verificando...' : 'Comenzar'}</button>
            </form>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', textDecoration: 'underline' }}>
                Acceso para Médicos
              </button>
            </div>
          </>
        )}

        {step === 'onboarding' && (
          <form onSubmit={handleSaveData}>
            <h2 style={{ textAlign: 'center', color: '#2d3748' }}>Crear Perfil Médico</h2>
            
            <div style={sectionTitle}>1. Datos Biométricos</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Edad</label>
                <input name="age" type="number" style={inputStyle} onChange={handleInputChange} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Altura (cm)</label>
                <input name="height" type="number" style={inputStyle} onChange={handleInputChange} required />
              </div>
            </div>
            
            <div style={sectionTitle}>2. Estilo de Vida y Nutrición</div>
            <label style={labelStyle}>Tipo de Dieta</label>
            <select name="diet_type" style={inputStyle} onChange={handleInputChange}>
              <option value="omnivoro">Omnívoro (Como de todo)</option>
              <option value="vegetariano">Vegetariano</option>
              <option value="vegano">Vegano</option>
              <option value="keto">Keto / Low Carb</option>
              <option value="paleo">Paleo</option>
            </select>

            <label style={labelStyle}>Alergias / Intolerancias</label>
            <input name="allergies" type="text" placeholder="Ej: Gluten, Nueces (o 'Ninguna')" style={inputStyle} onChange={handleInputChange} />

            <div style={sectionTitle}>3. Historial Médico</div>
            <label style={labelStyle}>Condiciones de Salud</label>
            <input name="medical_conditions" type="text" placeholder="Ej: Diabetes, Hipertensión (o 'Ninguna')" style={inputStyle} onChange={handleInputChange} />

            <label style={labelStyle}>Objetivo Principal</label>
            <select name="health_goal" style={inputStyle} onChange={handleInputChange}>
              <option value="salud_general">Mejorar salud general</option>
              <option value="perder_grasa">Perder grasa</option>
              <option value="ganar_musculo">Ganar masa muscular</option>
              <option value="control_medico">Controlar patología</option>
            </select>

            <label style={labelStyle}>Peso Actual (kg)</label>
            <input name="weight" type="number" step="0.1" style={inputStyle} onChange={handleInputChange} required />

            <button style={btnStyle} disabled={loading}>Crear Perfil</button>
          </form>
        )}

        {step === 'checkin' && (
          <form onSubmit={handleSaveData}>
            <h2 style={{ textAlign: 'center', color: '#2d3748' }}>Check-in Diario</h2>
            <p style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>Hola {name}, actualicemos tu estado.</p>

            <div style={sectionTitle}>Estado Físico</div>
            <label style={labelStyle}>Peso de hoy (kg)</label>
            <input name="weight" type="number" step="0.1" value={formData.weight} style={inputStyle} onChange={handleInputChange} />

            <label style={labelStyle}>Horas de sueño</label>
            <input name="sleep_hours" type="number" placeholder="Ej: 7" style={inputStyle} onChange={handleInputChange} />

            <div style={sectionTitle}>Bienestar</div>
            <label style={labelStyle}>Nivel de Estrés (1-10)</label>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom: '10px'}}>
                <span style={{fontSize:'12px'}}>Relajado</span>
                <input name="stress_level" type="range" min="1" max="10" value={formData.stress_level} onChange={handleInputChange} style={{flex:1}} />
                <span style={{fontSize:'12px'}}>Estresado ({formData.stress_level})</span>
            </div>

            <label style={labelStyle}>Consumo de Agua (Vasos)</label>
            <input name="daily_water" type="number" placeholder="Ej: 5" style={inputStyle} onChange={handleInputChange} />

            <label style={labelStyle}>Digestión / Sensación</label>
            <select name="digestion" style={inputStyle} onChange={handleInputChange}>
              <option value="normal">Normal / Ligero</option>
              <option value="pesada">Pesada / Hinchazón</option>
              <option value="acidez">Acidez / Reflujo</option>
              <option value="hambre">Mucha hambre / Ansiedad</option>
            </select>

            <button style={btnStyle} disabled={loading}>Actualizar y Entrar</button>
          </form>
        )}
      </div>
    </div>
  );
}