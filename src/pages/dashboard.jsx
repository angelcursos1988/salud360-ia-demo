import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

export default function MedicalDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    // Usamos created_at para asegurar que siempre devuelva datos si existen
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error cargando pacientes:", error.message);
    } else {
      setPatients(data || []);
      if (data?.length > 0) setSelectedPatient(data[0]); // Seleccionar el primero por defecto
    }
    setLoading(false);
  };

  const getStressColor = (level) => {
    if (level >= 8) return '#e74c3c'; // Crítico
    if (level >= 5) return '#f1c40f'; // Medio
    return '#27ae60'; // Óptimo
  };

  // Datos simulados para la gráfica (en el futuro los traeremos de una tabla de historial)
  const chartData = [
    { name: 'Lun', peso: selectedPatient?.weight + 2, estres: 8 },
    { name: 'Mar', peso: selectedPatient?.weight + 1.5, estres: 6 },
    { name: 'Mie', peso: selectedPatient?.weight + 1, estres: 7 },
    { name: 'Jue', peso: selectedPatient?.weight + 0.5, estres: 4 },
    { name: 'Hoy', peso: selectedPatient?.weight, estres: selectedPatient?.stress_level },
  ];

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando panel médico...</div>;

  return (
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ color: '#1e293b', margin: 0, fontSize: '28px' }}>Panel de Control Médico</h1>
            <p style={{ color: '#64748b' }}>Salud360 - Gestión de Pacientes y Biometría</p>
          </div>
          <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer' }}>
            Volver al Inicio
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
          
          {/* COLUMNA IZQUIERDA: LISTA Y GRÁFICA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* GRÁFICA DE EVOLUCIÓN */}
            <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '20px', color: '#334155' }}>Evolución de {selectedPatient?.name || 'Paciente'}</h3>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#3182ce" />
                    <YAxis yAxisId="right" orientation="right" stroke="#e74c3c" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="peso" stroke="#3182ce" strokeWidth={3} name="Peso (kg)" />
                    <Line yAxisId="right" type="monotone" dataKey="estres" stroke="#e74c3c" strokeWidth={3} name="Estrés" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TABLA DE PACIENTES */}
            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '15px', color: '#475569' }}>Paciente</th>
                    <th style={{ padding: '15px', color: '#475569' }}>Objetivo</th>
                    <th style={{ padding: '15px', color: '#475569' }}>Estrés</th>
                    <th style={{ padding: '15px', color: '#475569' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No hay pacientes registrados aún.</td></tr>
                  ) : (
                    patients.map(p => (
                      <tr key={p.id} 
                          onClick={() => setSelectedPatient(p)}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                            background: selectedPatient?.id === p.id ? '#f0f9ff' : 'transparent'
                          }}>
                        <td style={{ padding: '15px' }}>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{p.age} años • {p.weight}kg</div>
                        </td>
                        <td style={{ padding: '15px', fontSize: '14px', color: '#475569' }}>{p.health_goal}</td>
                        <td style={{ padding: '15px' }}>
                          <div style={{ 
                            width: '80px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' 
                          }}>
                            <div style={{ 
                              width: `${p.stress_level * 10}%`, height: '100%', 
                              background: getStressColor(p.stress_level) 
                            }} />
                          </div>
                        </td>
                        <td style={{ padding: '15px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); router.push(`/chat?id=${p.id}`); }}
                            style={{ background: '#3182ce', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Abrir Chat
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* COLUMNA DERECHA: DETALLE RÁPIDO */}
          <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', height: 'fit-content' }}>
            <h3 style={{ color: '#1e293b', marginTop: 0 }}>Ficha del Paciente</h3>
            {selectedPatient ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>DIETA</label>
                  <div style={{ color: '#334155', textTransform: 'capitalize' }}>{selectedPatient.diet_type}</div>
                </div>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>ALERGIAS</label>
                  <div style={{ color: '#e74c3c' }}>{selectedPatient.allergies || 'Ninguna'}</div>
                </div>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>CONDICIONES</label>
                  <div style={{ color: '#334155' }}>{selectedPatient.medical_conditions || 'Ninguna'}</div>
                </div>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>SUEÑO PROMEDIO</label>
                  <div style={{ color: '#3182ce' }}>{selectedPatient.sleep_hours} horas</div>
                </div>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>DIGESTIÓN</label>
                  <div style={{ color: '#334155' }}>{selectedPatient.digestion}</div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8' }}>Selecciona un paciente para ver su ficha completa.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}