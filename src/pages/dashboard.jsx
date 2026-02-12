import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    const { data } = await supabase
      .from('chat_history')
      .select('message')
      .eq('patient_id', id)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false });

    if (data) {
      const plan = data.find(m => m.message.length > 200 || m.message.toLowerCase().includes('menú') || m.message.toLowerCase().includes('desayuno'));
      setLastPlan(plan ? plan.message : "No se ha generado un plan nutricional detallado todavía.");
    }
  };

  // --- NUEVA FUNCIÓN: MARCAR RETO COMO COMPLETADO ---
  const toggleChallenge = async (challengeId, currentStatus) => {
    const { error } = await supabase
      .from('challenges')
      .update({ is_completed: !currentStatus })
      .eq('id', challengeId);

    if (!error) {
      setChallenges(challenges.map(c => 
        c.id === challengeId ? { ...c, is_completed: !currentStatus } : c
      ));
    }
  };

  // --- GENERACIÓN DE INFORME PDF ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    doc.setFontSize(20);
    doc.setTextColor(39, 174, 96);
    doc.text("Informe Clínico Salud360", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de emisión: ${date}`, 14, 30);
    doc.text(`ID Paciente: ${selectedPatient.id.substring(0, 8)}`, 14, 35);

    doc.autoTable({
      startY: 40,
      head: [['Concepto', 'Detalle']],
      body: [
        ['Nombre Completo', selectedPatient.name],
        ['Edad', `${selectedPatient.age} años`],
        ['Biometría', `${selectedPatient.height}cm | Sexo: ${selectedPatient.gender}`],
        ['Estilo de Vida', `Actividad: ${selectedPatient.activity} | Dieta: ${selectedPatient.diet_type}`],
        ['Alergias', selectedPatient.allergies || 'Ninguna conocida'],
        ['Objetivo Principal', selectedPatient.health_goal]
      ],
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96] },
      styles: { fontSize: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text("Último Plan Nutricional Sugerido por IA", 14, finalY);
    
    doc.setFontSize(9);
    doc.setTextColor(50);
    const splitPlan = doc.splitTextToSize(lastPlan, 180);
    doc.text(splitPlan, 14, finalY + 10);

    doc.save(`Informe_${selectedPatient.name.replace(/\s+/g, '_')}.pdf`);
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

  // Cálculo de progreso para la barra visual
  const completedCount = challenges.filter(c => c.is_completed).length;
  const progressPercent = challenges.length > 0 ? Math.round((completedCount / challenges.length) * 100) : 0;

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
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={generatePDF} style={{ padding: '10px 20px', borderRadius: '8px', background: '#34495e', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>📄 Generar Informe</button>
                <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '8px', background: '#27ae60', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Nueva Consulta</button>
              </div>
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

                {/* BLOQUE DE ESTILO DE VIDA */}
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

                {/* PLAN NUTRICIONAL */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1e293b' }}>📋 Último Plan Nutricional Sugerido</h3>
                  <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line', border: '1px solid #e2e8f0', color: '#334155' }}>
                    {lastPlan}
                  </div>
                </div>

                {/* ALERGIAS */}
                <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '15px', border: '1px solid #fee2e2' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '14px' }}>⚠️ Alergias y Observaciones</h4>
                  <p style={{ margin: 0, color: '#b91c1c', fontSize: '15px' }}>{selectedPatient.allergies || 'Sin alergias conocidas.'}</p>
                </div>
              </div>

              {/* COLUMNA DERECHA: RETOS INTERACTIVOS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: 'fit-content' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>🎯 Objetivos y Progreso</h3>
                  
                  {challenges.length > 0 ? challenges.map(c => (
                    <div key={c.id} style={{ 
                      padding: '12px', 
                      background: c.is_completed ? '#f0fdf4' : '#f8fafc', 
                      borderRadius: '10px', 
                      marginBottom: '10px', 
                      borderLeft: `4px solid ${c.is_completed ? '#27ae60' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.3s ease'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={c.is_completed || false} 
                        onChange={() => toggleChallenge(c.id, c.is_completed)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#27ae60' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 'bold', 
                          fontSize: '13px', 
                          textDecoration: c.is_completed ? 'line-through' : 'none',
                          color: c.is_completed ? '#64748b' : '#1e293b'
                        }}>
                          {c.title}
                        </div>
                        <div style={{fontSize: '11px', color: '#94a3b8'}}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )) : <p style={{color: '#94a3b8', fontSize: '13px'}}>No hay retos activos.</p>}

                  {/* Barra de Progreso Visual */}
                  {challenges.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                        <span>Cumplimiento</span>
                        <span style={{ fontWeight: 'bold', color: '#27ae60' }}>{progressPercent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${progressPercent}%`, 
                          height: '100%', 
                          background: '#27ae60',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : <div style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8'}}>Selecciona un paciente.</div>}
      </main>
    </div>
  );
}