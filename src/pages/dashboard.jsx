import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dynamic from 'next/dynamic';
import Link from 'next/link'; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Importación dinámica del visualizador para evitar errores de SSR con Three.js
const MiniVisualizer = dynamic(() => import('../components/BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '120px', background: '#020617', borderRadius: '12px' }} />
});

export default function MedicalDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [lastPlan, setLastPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchPatients(); }, []);

  useEffect(() => {
    if (selectedPatient?.id) {
      fetchHistory(selectedPatient.id);
      fetchChallenges(selectedPatient.id);
      fetchLastPlan(selectedPatient.id);
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

  const fetchLastPlan = async (id) => {
    const { data } = await supabase.from('chat_history').select('message').eq('patient_id', id).eq('role', 'assistant').order('created_at', { ascending: false });
    if (data) {
      const plan = data.find(m => m.message.length > 200 || m.message.toLowerCase().includes('menú'));
      setLastPlan(plan ? plan.message : "No hay plan detallado.");
    }
  };

  const updateBiometricProgress = async (field, value) => {
    const newValue = parseInt(value);
    const { error } = await supabase
      .from('patients')
      .update({ [field]: newValue })
      .eq('id', selectedPatient.id);

    if (!error) {
      setSelectedPatient({ ...selectedPatient, [field]: newValue });
      setPatients(patients.map(p => p.id === selectedPatient.id ? { ...p, [field]: newValue } : p));
    }
  };

  const toggleChallenge = async (challengeId, currentStatus) => {
    const { error } = await supabase.from('challenges').update({ is_completed: !currentStatus }).eq('id', challengeId);
    if (!error) {
      setChallenges(challenges.map(c => c.id === challengeId ? { ...c, is_completed: !currentStatus } : c));
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(39, 174, 96);
    doc.text("Informe Clínico Salud360", 14, 22);
    doc.autoTable({
      startY: 40,
      head: [['Concepto', 'Detalle']],
      body: [
        ['Nombre', selectedPatient.name],
        ['Edad', `${selectedPatient.age} años`],
        ['Biometría', `${selectedPatient.height}cm | ${selectedPatient.gender}`],
        ['Objetivo', selectedPatient.health_goal]
      ],
      headStyles: { fillColor: [39, 174, 96] }
    });
    doc.save(`Informe_${selectedPatient.name}.pdf`);
  };

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Cargando Dashboard Médico...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#f8fafc' }}>
      
      <aside style={{ background: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px', color: '#0f172a' }}>🩺 Pacientes</h2>
        {patients.map(p => (
          <div key={p.id} onClick={() => setSelectedPatient(p)} style={{ 
            padding: '16px', borderRadius: '20px', cursor: 'pointer', marginBottom: '12px',
            background: selectedPatient?.id === p.id ? '#f1f5f9' : 'white',
            border: `1px solid ${selectedPatient?.id === p.id ? '#cbd5e1' : '#f1f5f9'}`,
            display: 'flex', gap: '12px', alignItems: 'center', transition: 'all 0.2s'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: '#020617' }}>
               <MiniVisualizer patientData={p} isMini={true} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{fontWeight: '700', fontSize: '13px', color: '#1e293b'}}>{p.name}</div>
              <div style={{fontSize: '11px', color: '#64748b'}}>Estrés: {p.stress_level}/10</div>
            </div>
          </div>
        ))}
      </aside>

      <main style={{ padding: '40px', overflowY: 'auto' }}>
        {selectedPatient ? (
          <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '100px', height: '120px', borderRadius: '16px', overflow: 'hidden', background: '#020617' }}>
                    <MiniVisualizer patientData={selectedPatient} isMini={true} />
                </div>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>{selectedPatient.name}</h1>
                  <p style={{ color: '#64748b', margin: 0 }}>Status: {selectedPatient.health_goal}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={generatePDF} style={{ padding: '12px 24px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '700' }}>📄 PDF</button>
                
                {/* CAMBIO CLAVE AQUÍ: Usamos el objeto de ruta para pasar el ID como query param */}
                <Link href={{ pathname: '/chat', query: { id: selectedPatient.id } }} passHref>
                  <button style={{ padding: '12px 24px', borderRadius: '12px', background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '700' }}>
                    💬 Abrir Chat
                  </button>
                </Link>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ background: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800' }}>🎛️ Control de Objetivos Reales</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    {[
                      { label: '🏃 Actividad', field: 'progress_activity', color: '#3b82f6' },
                      { label: '💧 Hidratación', field: 'progress_hydration', color: '#0ea5e9' },
                      { label: '🧘 Estrés', field: 'progress_stress', color: '#8b5cf6' }
                    ].map(item => (
                      <div key={item.field}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{item.label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                          <input 
                            type="range" min="0" max="100" 
                            value={selectedPatient[item.field] || 0}
                            onChange={(e) => updateBiometricProgress(item.field, e.target.value)}
                            style={{ flex: 1, accentColor: item.color, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: '800', width: '35px' }}>{selectedPatient[item.field] || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800' }}>📈 Histórico de Peso</h3>
                  <div style={{ width: '100%', height: '250px' }}>
                    {history.length > 0 ? (
                      <ResponsiveContainer>
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="fecha" />
                          <YAxis hide />
                          <Tooltip />
                          <Line type="monotone" dataKey="peso" stroke="#22c55e" strokeWidth={4} dot={{r: 6, fill: '#22c55e'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p style={{textAlign: 'center', color: '#94a3b8', paddingTop: '80px'}}>No hay registros históricos.</p>}
                  </div>
                </div>

                <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>📋 Plan Actual</h3>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line', color: '#334155' }}>
                    {lastPlan}
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800' }}>🎯 Checkbox de Retos</h3>
                {challenges.length > 0 ? challenges.map(c => (
                  <div key={c.id} style={{ 
                    padding: '12px', background: c.is_completed ? '#f0fdf4' : '#f8fafc', 
                    borderRadius: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <input type="checkbox" checked={c.is_completed} onChange={() => toggleChallenge(c.id, c.is_completed)} style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', textDecoration: c.is_completed ? 'line-through' : 'none', color: c.is_completed ? '#94a3b8' : '#1e293b' }}>{c.title}</span>
                  </div>
                )) : <p style={{ color: '#94a3b8', fontSize: '13px' }}>No hay retos asignados.</p>}
              </div>
            </div>
          </div>
        ) : <div style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8'}}>Selecciona un paciente para comenzar.</div>}
      </main>
    </div>
  );
}