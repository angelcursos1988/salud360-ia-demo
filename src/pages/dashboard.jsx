import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function MedicalDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchHistory(selectedPatient.id);
      fetchChallenges(selectedPatient.id);
    }
  }, [selectedPatient]);

  const fetchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setPatients(data);
      if (data.length > 0 && !selectedPatient) setSelectedPatient(data[0]);
    }
    setLoading(false);
  };

  // NUEVA FUNCIÓN: ELIMINAR PACIENTE
  const deletePatient = async (e, id) => {
    e.stopPropagation(); // Evita que al borrar se seleccione el paciente
    if (!confirm("¿Estás seguro de que quieres eliminar este paciente? Se borrará todo su historial y retos.")) return;

    const { error } = await supabase.from('patients').delete().eq('id', id);
    
    if (error) {
      alert("Error al borrar: " + error.message);
    } else {
      const updatedPatients = patients.filter(p => p.id !== id);
      setPatients(updatedPatients);
      if (selectedPatient?.id === id) {
        setSelectedPatient(updatedPatients[0] || null);
      }
    }
  };

  const fetchHistory = async (id) => {
    const { data } = await supabase
      .from('health_logs')
      .select('weight, stress_level, created_at')
      .eq('patient_id', id)
      .order('created_at', { ascending: true });
    
    if (data) {
      const formatted = data.map(d => ({
        fecha: new Date(d.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' }),
        peso: d.weight,
        estres: d.stress_level
      }));
      setHistory(formatted);
    }
  };

  const fetchChallenges = async (id) => {
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: false });
    setChallenges(data || []);
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando Panel...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
      
      {/* SIDEBAR */}
      <aside style={{ background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}>Gestión Clínica</h2>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          {patients.length === 0 && <p style={{color: '#94a3b8', textAlign: 'center', fontSize: '14px'}}>No hay pacientes registrados.</p>}
          {patients.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatient(p)}
              style={{ 
                padding: '12px', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px',
                position: 'relative', transition: 'all 0.2s',
                background: selectedPatient?.id === p.id ? '#f0fdf4' : 'transparent',
                border: selectedPatient?.id === p.id ? '1px solid #27ae60' : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '25px' }}>
                <span style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>{p.name}</span>
                {p.stress_level >= 8 && (
                  <span style={{ background: '#ef4444', width: '8px', height: '8px', borderRadius: '50%' }}></span>
                )}
              </div>
              
              {/* BOTÓN ELIMINAR */}
              <button 
                onClick={(e) => deletePatient(e, p.id)}
                style={{ 
                  position: 'absolute', right: '10px', top: '15px', background: 'none', 
                  border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '16px' 
                }}
                onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                onMouseLeave={(e) => e.target.style.color = '#cbd5e1'}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL (Igual que antes pero con manejo de estado vacío) */}
      <main style={{ overflowY: 'auto', padding: '40px' }}>
        {selectedPatient ? (
          <>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Ficha de {selectedPatient.name}</h1>
              </div>
              <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' }}>Volver Inicio</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
              {/* Gráfica */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ width: '100%', height: '350px' }}>
                  <ResponsiveContainer>
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="fecha" />
                      <YAxis yAxisId="left" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="peso" stroke="#27ae60" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Retos */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0 }}>🎯 Retos de IA</h3>
                {challenges.length > 0 ? challenges.map(c => (
                  <div key={c.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #27ae60' }}>
                    <div style={{fontWeight: 'bold', fontSize: '14px'}}>{c.title}</div>
                    <div style={{fontSize: '11px', color: '#64748b'}}>{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                )) : <p style={{color: '#94a3b8', fontSize: '13px'}}>No hay retos aún.</p>}
              </div>
            </div>
          </>
        ) : (
          <div style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8'}}>Selecciona un paciente o limpia la lista para empezar de nuevo.</div>
        )}
      </main>
    </div>
  );
}