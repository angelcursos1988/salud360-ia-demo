import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MedicalDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchPatients(); }, []);

  useEffect(() => {
    if (selectedPatient) fetchHistory(selectedPatient.id);
  }, [selectedPatient]);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (data) {
      setPatients(data);
      setSelectedPatient(data[0]);
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

  if (loading) return <p>Cargando Dashboard...</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh', fontFamily: 'sans-serif', background: '#f1f5f9' }}>
      {/* Sidebar: Lista de Pacientes */}
      <div style={{ background: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', color: '#1e293b' }}>Pacientes</h2>
        {patients.map(p => (
          <div 
            key={p.id} 
            onClick={() => setSelectedPatient(p)}
            style={{ 
              padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px',
              background: selectedPatient?.id === p.id ? '#f0fdf4' : 'transparent',
              border: selectedPatient?.id === p.id ? '1px solid #27ae60' : '1px solid transparent'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{p.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{p.health_goal}</div>
          </div>
        ))}
      </div>

      {/* Contenido Principal */}
      <div style={{ padding: '30px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <h1>Panel de {selectedPatient?.name}</h1>
          <button onClick={() => router.push('/')} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd' }}>Salir</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3>Evolución de Peso y Estrés</h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" />
                  <YAxis yAxisId="left" orientation="left" stroke="#27ae60" />
                  <YAxis yAxisId="right" orientation="right" stroke="#e74c3c" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="peso" stroke="#27ae60" strokeWidth={3} dot={{r: 6}} />
                  <Line yAxisId="right" type="monotone" dataKey="estres" stroke="#e74c3c" strokeWidth={3} dot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3>Ficha Clínica</h3>
            <p><strong>Edad:</strong> {selectedPatient?.age} años</p>
            <p><strong>Altura:</strong> {selectedPatient?.height} cm</p>
            <p><strong>Dieta:</strong> {selectedPatient?.diet_type}</p>
            <p><strong>Alergias:</strong> {selectedPatient?.allergies || 'Ninguna'}</p>
            <p><strong>Condiciones:</strong> {selectedPatient?.medical_conditions || 'Ninguna'}</p>
            <button 
              onClick={() => router.push(`/chat?id=${selectedPatient.id}`)}
              style={{ background: '#2c3e50', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', width: '100%', marginTop: '20px', cursor: 'pointer' }}
            >
              Intervenir en Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}