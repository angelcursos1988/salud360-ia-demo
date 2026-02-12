import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MedicalDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchPatients(); }, []);

  useEffect(() => {
    if (selectedPatient?.id) {
      fetchHistory(selectedPatient.id);
      fetchChallenges(selectedPatient.id);
    }
  }, [selectedPatient?.id]);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('*').order('updated_at', { ascending: false });
    if (data) {
      setPatients(data);
      if (data.length > 0 && !selectedPatient) setSelectedPatient(data[0]);
    }
    setLoading(false);
  };

  const fetchHistory = async (id) => {
    const { data } = await supabase.from('health_logs').select('*').eq('patient_id', id).order('created_at', { ascending: true });
    if (data) {
      setHistory(data.map(d => ({
        fecha: new Date(d.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        peso: d.weight,
        estres: d.stress_level
      })));
    }
  };

  const fetchChallenges = async (id) => {
    const { data } = await supabase.from('challenges').select('*').eq('patient_id', id).order('created_at', { ascending: false });
    setChallenges(data || []);
  };

  // FUNCIÓN DE BORRADO CORREGIDA
  const deletePatient = async (e, id) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar permanentemente a este paciente?")) return;

    const { error } = await supabase.from('patients').delete().eq('id', id);
    
    if (error) {
      console.error("Error al borrar:", error);
      alert("No se pudo borrar: " + error.message);
    } else {
      // Actualizamos la lista local inmediatamente
      const filtered = patients.filter(p => p.id !== id);
      setPatients(filtered);
      if (selectedPatient?.id === id) setSelectedPatient(filtered[0] || null);
    }
  };

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Cargando Dashboard Médico...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh', fontFamily: 'sans-serif', background: '#f8fafc' }}>
      
      {/* SIDEBAR */}
      <aside style={{ background: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#1e293b' }}>Directorio Médico</h2>
        {patients.map(p => (
          <div key={p.id} onClick={() => setSelectedPatient(p)} style={{ 
            padding: '12px', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px', position: 'relative',
            background: selectedPatient?.id === p.id ? '#f0fdf4' : 'white',
            border: `1px solid ${selectedPatient?.id === p.id ? '#27ae60' : '#e2e8f0'}`
          }}>
            <div style={{fontWeight: '600', fontSize: '14px', color: '#334155'}}>{p.name}</div>
            <div style={{fontSize: '11px', color: '#94a3b8'}}>{p.health_goal}</div>
            <button onClick={(e) => deletePatient(e, p.id)} style={{ position: 'absolute', right: '10px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
          </div>
        ))}
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ padding: '40px', overflowY: 'auto' }}>
        {selectedPatient ? (
          <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
              <h1 style={{ fontSize: '24px', margin: 0 }}>Ficha Clínica: {selectedPatient.name}</h1>
              <button onClick={() => router.push('/')} style={{ padding: '8px 16px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer' }}>Salir</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '25px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* GRÁFICA */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 20px 0' }}>Evolución Biométrica</h3>
                  <div style={{ width: '100%', height: '300px' }}>
                    {history.length > 0 ? (
                      <ResponsiveContainer>
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="fecha" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="peso" stroke="#27ae60" strokeWidth={3} dot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p style={{textAlign: 'center', color: '#94a3b8', paddingTop: '100px'}}>Sin registros históricos suficientes.</p>}
                  </div>
                </div>

                {/* INFO ADICIONAL (Lo que se había perdido) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>DIETA ACTUAL</h4>
                    <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'capitalize' }}>{selectedPatient.diet_type}</p>
                  </div>
                  <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>ALERGIAS</h4>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#ef4444' }}>{selectedPatient.allergies || 'Ninguna'}</p>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: RETOS */}
              <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 20px 0' }}>🎯 Retos de la IA</h3>
                {challenges.length > 0 ? challenges.map(c => (
                  <div key={c.id} style={{ padding: '12px', background: '#f0fdf4', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #27ae60' }}>
                    <div style={{fontWeight: 'bold', fontSize: '14px'}}>{c.title}</div>
                    <div style={{fontSize: '11px', color: '#16a34a'}}>{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                )) : <p style={{color: '#94a3b8', fontSize: '13px'}}>No hay retos asignados.</p>}
              </div>

            </div>
          </div>
        ) : <div style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8'}}>Selecciona un paciente para ver su ficha completa.</div>}
      </main>
    </div>
  );
}