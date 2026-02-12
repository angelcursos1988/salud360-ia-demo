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
      if (!selectedPatient) setSelectedPatient(data[0]);
    }
    setLoading(false);
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

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #27ae60', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
        <p style={{ color: '#64748b' }}>Cargando Panel Médico...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
      
      {/* SIDEBAR: LISTA DE PACIENTES */}
      <aside style={{ background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}>Pacientes</h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Salud360 Control Center</p>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          {patients.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatient(p)}
              style={{ 
                padding: '16px', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px',
                transition: 'all 0.2s',
                background: selectedPatient?.id === p.id ? '#f0fdf4' : 'transparent',
                border: selectedPatient?.id === p.id ? '1px solid #27ae60' : '1px solid transparent',
                boxShadow: selectedPatient?.id === p.id ? '0 4px 6px -1px rgba(39,174,96,0.1)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: '#334155' }}>{p.name}</span>
                {p.stress_level >= 8 && (
                  <span title="Alerta: Estrés Alto" style={{ background: '#ef4444', width: '8px', height: '8px', borderRadius: '50%' }}></span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{p.health_goal}</div>
            </div>
          ))}
        </div>
        
        <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={() => router.push('/')} style={{ width: '100%', padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ overflowY: 'auto', padding: '40px' }}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1e293b', margin: 0 }}>Ficha de {selectedPatient?.name}</h1>
            <p style={{ color: '#64748b' }}>Última actualización: {new Date(selectedPatient?.updated_at).toLocaleDateString()}</p>
          </div>
          <button 
            onClick={() => router.push(`/chat?id=${selectedPatient.id}`)}
            style={{ background: '#27ae60', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(39,174,96,0.2)' }}
          >
            Intervenir en Chat
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          
          {/* GRÁFICA DE EVOLUCIÓN */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '24px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 Tendencia Biométrica
              <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#27ae60' }}>● Peso (kg)</span>
              <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#ef4444' }}>● Estrés</span>
            </h3>
            <div style={{ width: '100%', height: '350px' }}>
              {history.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="peso" stroke="#27ae60" strokeWidth={4} dot={{r: 6, fill: '#27ae60', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                    <Line yAxisId="right" type="monotone" dataKey="estres" stroke="#ef4444" strokeWidth={4} dot={{r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
                  Esperando suficientes datos históricos...
                </div>
              )}
            </div>
          </div>

          {/* FICHA DETALLADA Y RETOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Perfil Clínico</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'block' }}>DIETA</label>
                  <span style={{ color: '#1e293b', fontWeight: '500', textTransform: 'capitalize' }}>{selectedPatient?.diet_type}</span>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'block' }}>SUEÑO</label>
                  <span style={{ color: '#1e293b', fontWeight: '500' }}>{selectedPatient?.sleep_hours}h promedio</span>
                </div>
              </div>
              <div style={{ marginTop: '15px', padding: '12px', background: '#fff1f2', borderRadius: '10px' }}>
                <label style={{ fontSize: '11px', color: '#be123c', fontWeight: 'bold', display: 'block' }}>ALERGIAS / RIESGOS</label>
                <span style={{ color: '#be123c', fontWeight: '500' }}>{selectedPatient?.allergies || 'Sin registros'}</span>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1 }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>🎯 Retos Semanales</h3>
              {challenges.length > 0 ? challenges.map(c => (
                <div key={c.id} style={{ 
                  padding: '14px', background: c.is_completed ? '#f0fdf4' : '#fffbeb', 
                  borderRadius: '12px', border: `1px solid ${c.is_completed ? '#dcfce7' : '#fef3c7'}`,
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{c.is_completed ? '✅' : '⏳'}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: c.is_completed ? '#166534' : '#92400e', fontSize: '14px' }}>{c.title}</div>
                      <div style={{ fontSize: '11px', color: c.is_completed ? '#16a34a' : '#b45309' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '12px' }}>
                  <p style={{ fontSize: '13px' }}>Aún no hay retos asignados por la IA.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}