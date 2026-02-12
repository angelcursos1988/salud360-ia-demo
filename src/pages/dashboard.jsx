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

  const deletePatient = async (e, id) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar permanentemente a este paciente?")) return;
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (!error) {
      const filtered = patients.filter(p => p.id !== id);
      setPatients(filtered);
      if (selectedPatient?.id === id) setSelectedPatient(filtered[0] || null);
    }
  };

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Cargando Dashboard...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh', fontFamily: 'sans-serif', background: '#f8fafc' }}>
      
      {/* SIDEBAR */}
      <aside style={{ background: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#1e293b' }}>Panel Médico</h2>
        {patients.map(p => (
          <div key={p.id} onClick={() => setSelectedPatient(p)} style={{ 
            padding: '12px', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px', position: 'relative',
            background: selectedPatient?.id === p.id ? '#f0fdf4' : 'white',
            border: `1px solid ${selectedPatient?.id === p.id ? '#27ae60' : '#e2e8f0'}`
          }}>
            <div style={{fontWeight: '600', fontSize: '14px', color: '#334155'}}>{p.name}</div>
            <div style={{fontSize: '11px', color: '#64748b'}}>{p.health_goal}</div>
            <button onClick={(e) => deletePatient(e, p.id)} style={{ position: 'absolute', right: '10px', top: '15px', border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
          </div>
        ))}
      </aside>

      {/* MAIN */}
      <main style={{ padding: '40px', overflowY: 'auto' }}>
        {selectedPatient ? (
          <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '24px', margin: 0 }}>{selectedPatient.name}</h1>
                <p style={{ color: '#64748b', margin: 0 }}>{selectedPatient.age} años | {selectedPatient.height} cm</p>
              </div>
              <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '8px', background: '#27ae60', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Nueva Consulta</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '25px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* GRÁFICA */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Evolución de Peso</h3>
                  <div style={{ width: '100%', height: '250px' }}>
                    {history.length > 0 ? (
                      <ResponsiveContainer>
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="fecha" />
                          <YAxis hide />
                          <Tooltip />
                          <Line type="monotone" dataKey="peso" stroke="#27ae60" strokeWidth={4} dot={{r: 6, fill: '#27ae60'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p style={{textAlign: 'center', color: '#94a3b8', paddingTop: '80px'}}>Sin datos históricos.</p>}
                  </div>
                </div>

                {/* BLOQUE DE ESTILO DE VIDA (NUEVO) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Sexo</span>
                    <p style={{ margin: '5px 0 0 0', fontWeight: '600', textTransform: 'capitalize' }}>{selectedPatient.gender || 'No definido'}</p>
                  </div>
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Actividad</span>
                    <p style={{ margin: '5px 0 0 0', fontWeight: '600', textTransform: 'capitalize' }}>{selectedPatient.activity || 'No definida'}</p>
                  </div>
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Dieta</span>
                    <p style={{ margin: '5px 0 0 0', fontWeight: '600', textTransform: 'capitalize' }}>{selectedPatient.diet_type || 'No definida'}</p>
                  </div>
                </div>

                {/* ALERGIAS Y CONDICIONES */}
                <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '15px', border: '1px solid #fee2e2' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '14px' }}>⚠️ Alergias y Observaciones</h4>
                  <p style={{ margin: 0, color: '#b91c1c', fontSize: '15px' }}>{selectedPatient.allergies || 'Sin alergias conocidas.'}</p>
                </div>
              </div>

              {/* RETOS */}
              <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>🎯 Objetivos IA</h3>
                {challenges.length > 0 ? challenges.map(c => (
                  <div key={c.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #27ae60' }}>
                    <div style={{fontWeight: 'bold', fontSize: '13px'}}>{c.title}</div>
                    <div style={{fontSize: '11px', color: '#94a3b8'}}>{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                )) : <p style={{color: '#94a3b8', fontSize: '13px'}}>No hay retos activos.</p>}
              </div>

            </div>
          </div>
        ) : <div style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8'}}>Selecciona un paciente.</div>}
      </main>
    </div>
  );
}