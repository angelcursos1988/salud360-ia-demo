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

  useEffect(() => {
    fetchPatients();
  }, []);

  // EFECTO CRÍTICO: Recarga todo cuando cambia el ID del paciente
  useEffect(() => {
    if (selectedPatient?.id) {
      console.log("Cambiando a paciente:", selectedPatient.name);
      setHistory([]);
      setChallenges([]);
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
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: true });
    
    if (error) console.error("Error logs:", error);
    if (data) {
      console.log("Datos de historial cargados:", data.length);
      setHistory(data.map(d => ({
        fecha: new Date(d.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        peso: d.weight,
        estres: d.stress_level
      })));
    }
  };

  const fetchChallenges = async (id) => {
    const { data } = await supabase.from('challenges').select('*').eq('patient_id', id);
    if (data) setChallenges(data);
  };

  const deletePatient = async (e, id) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este paciente y todos sus datos?")) return;
    await supabase.from('patients').delete().eq('id', id);
    fetchPatients();
  };

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Iniciando Panel...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh', fontFamily: 'sans-serif', background: '#f1f5f9' }}>
      <aside style={{ background: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Pacientes Activos</h2>
        {patients.map(p => (
          <div key={p.id} onClick={() => setSelectedPatient(p)} style={{ 
            padding: '12px', borderRadius: '10px', cursor: 'pointer', marginBottom: '8px', position: 'relative',
            background: selectedPatient?.id === p.id ? '#f0fdf4' : 'white',
            border: `1px solid ${selectedPatient?.id === p.id ? '#27ae60' : '#e2e8f0'}`
          }}>
            <div style={{fontWeight: '600', fontSize: '14px'}}>{p.name}</div>
            <button onClick={(e) => deletePatient(e, p.id)} style={{ position: 'absolute', right: '10px', top: '10px', border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
          </div>
        ))}
      </aside>

      <main style={{ padding: '40px', overflowY: 'auto' }}>
        {selectedPatient ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <h1>{selectedPatient.name}</h1>
              <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }}>Cerrar Dashboard</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '25px' }}>
              <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3>Evolución Biométrica</h3>
                <div style={{ width: '100%', height: '300px', marginTop: '20px' }}>
                  {history.length > 0 ? (
                    <ResponsiveContainer>
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="peso" stroke="#27ae60" strokeWidth={3} dot={{r: 5}} />
                        <Line type="monotone" dataKey="estres" stroke="#ef4444" strokeWidth={3} dot={{r: 5}} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <div style={{textAlign: 'center', paddingTop: '100px', color: '#94a3b8'}}>Sin datos de seguimiento. Haz un check-in con el paciente.</div>}
                </div>
              </div>

              <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3>Retos Semanales</h3>
                {challenges.length > 0 ? challenges.map(c => (
                  <div key={c.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #27ae60' }}>
                    <div style={{fontWeight: 'bold'}}>{c.title}</div>
                    <div style={{fontSize: '11px', color: '#64748b'}}>{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                )) : <p style={{color: '#94a3b8'}}>No hay retos registrados.</p>}
              </div>
            </div>
          </div>
        ) : <p>Selecciona un paciente a la izquierda.</p>}
      </main>
    </div>
  );
}