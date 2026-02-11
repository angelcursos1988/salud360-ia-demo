import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Obtener pacientes
      const { data: patientsData, error } = await supabase
        .from('patients')
        .select(`
          *,
          avatars ( health, happiness )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPatients(patientsData);

      // 2. Calcular estadísticas básicas
      const total = patientsData.length;
      // Consideramos "crítico" si la salud del avatar es menor a 50 (si tiene avatar)
      const critical = patientsData.filter(p => p.avatars && p.avatars.length > 0 && p.avatars[0].health < 50).length;
      
      setStats({
        total,
        critical,
        active: total // Por ahora todos cuentan como activos
      });

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>🏥 Cargando Panel Médico...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#2c3e50', margin: 0 }}>Panel de Control Médico</h1>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0 0' }}>Salud360 - Vista de Especialista</p>
        </div>
        <button onClick={fetchData} style={{ padding: '10px 20px', background: 'white', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer' }}>
          🔄 Actualizar
        </button>
      </header>

      {/* KPI CARDS (Indicadores) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>Pacientes Totales</h3>
          <p style={cardValueStyle}>{stats.total}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>⚠️ Atención Prioritaria</h3>
          <p style={{ ...cardValueStyle, color: '#e74c3c' }}>{stats.critical}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>✅ Estables</h3>
          <p style={{ ...cardValueStyle, color: '#27ae60' }}>{stats.total - stats.critical}</p>
        </div>
      </div>

      {/* TABLA DE PACIENTES */}
      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
            <tr>
              <th style={thStyle}>Paciente</th>
              <th style={thStyle}>Fecha Ingreso</th>
              <th style={thStyle}>Estado de Salud (Avatar)</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>
                  <strong>{patient.name}</strong>
                  <br/>
                  <span style={{ fontSize: '12px', color: '#999' }}>ID: {patient.id.slice(0, 8)}...</span>
                </td>
                <td style={tdStyle}>
                  {new Date(patient.created_at).toLocaleDateString()}
                </td>
                <td style={tdStyle}>
                  {patient.avatars && patient.avatars.length > 0 ? (
                    <div>
                      <span style={{ marginRight: '10px' }}>
                        {patient.avatars[0].health >= 50 ? '😊' : '🤒'}
                      </span>
                      <progress value={patient.avatars[0].health} max="100" style={{ width: '100px' }}></progress>
                      <span style={{ marginLeft: '10px', fontSize: '12px' }}>{patient.avatars[0].health}%</span>
                    </div>
                  ) : (
                    <span style={{ color: '#ccc' }}>Sin datos</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button style={{ padding: '6px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Ver Historial
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {patients.length === 0 && (
          <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No hay pacientes registrados aún.</p>
        )}
      </div>
    </div>
  );
}

// Estilos simples en variables para no ensuciar el JSX
const cardStyle = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const cardLabelStyle = { fontSize: '14px', color: '#7f8c8d', margin: '0 0 10px 0', textTransform: 'uppercase' };
const cardValueStyle = { fontSize: '36px', fontWeight: 'bold', margin: 0, color: '#2c3e50' };
const thStyle = { padding: '15px', color: '#7f8c8d', fontSize: '14px', fontWeight: '600' };
const tdStyle = { padding: '15px', color: '#2c3e50' };