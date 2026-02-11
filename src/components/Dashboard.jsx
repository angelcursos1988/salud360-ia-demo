import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generatePatientReport } from '../lib/reportGenerator';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, stable: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Obtener pacientes y sus avatars
      const { data: patientsData, error } = await supabase
        .from('patients')
        .select(`
          *,
          avatars ( health, happiness )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(patientsData);

      // 2. Calcular estadísticas
      const total = patientsData.length;
      const critical = patientsData.filter(p => p.avatars?.[0]?.health < 50).length;
      
      setStats({
        total,
        critical,
        stable: total - critical
      });

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (patient) => {
    try {
      console.log("Consultando tabla chat_history para el paciente:", patient.id);
      
      // CAMBIO CLAVE: Usamos 'chat_history' en lugar de 'messages'
      const { data: messages, error } = await supabase
        .from('chat_history') 
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error de Supabase:", error);
        alert("Error al conectar con la tabla chat_history. Revisa los permisos RLS.");
        return;
      }

      if (!messages || messages.length === 0) {
        alert("Este paciente aún no tiene historial de chat para generar el informe.");
        return;
      }

      // Generar el PDF
      await generatePatientReport(patient, messages);
      
    } catch (error) {
      console.error("Error en la descarga:", error);
      alert("Hubo un error al procesar el archivo.");
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>🏥 Cargando Panel Médico...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#2c3e50', margin: 0 }}>Panel de Control Médico</h1>
          <p style={{ color: '#7f8c8d' }}>Gestión de Pacientes e Informes Clínicos</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.location.href = '/'} style={secondaryButtonStyle}>🏠 Ir a Inicio</button>
            <button onClick={fetchData} style={primaryButtonStyle}>🔄 Refrescar</button>
        </div>
      </header>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>Total Pacientes</h3>
          <p style={cardValueStyle}>{stats.total}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>⚠️ Riesgo Alto</h3>
          <p style={{ ...cardValueStyle, color: '#e74c3c' }}>{stats.critical}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>✅ Estables</h3>
          <p style={{ ...cardValueStyle, color: '#27ae60' }}>{stats.stable}</p>
        </div>
      </div>

      {/* LISTA DE PACIENTES */}
      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
            <tr>
              <th style={thStyle}>Paciente</th>
              <th style={thStyle}>Salud Avatar</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>
                  <strong>{p.name}</strong><br/>
                  <span style={{ fontSize: '11px', color: '#999' }}>ID: {p.id.slice(0,8)}</span>
                </td>
                <td style={tdStyle}>
                  {p.avatars?.[0] ? (
                    <span>{p.avatars[0].health < 50 ? '🤒' : '😊'} {p.avatars[0].health}%</span>
                  ) : '—'}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => downloadReport(p)} style={downloadButtonStyle}>
                    📥 Descargar PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Estilos rápidos
const cardStyle = { background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #eee' };
const cardLabelStyle = { fontSize: '12px', color: '#7f8c8d', margin: '0 0 5px 0', textTransform: 'uppercase' };
const cardValueStyle = { fontSize: '32px', fontWeight: 'bold', margin: 0 };
const thStyle = { padding: '15px', textAlign: 'left', color: '#777', fontSize: '13px' };
const tdStyle = { padding: '15px' };
const primaryButtonStyle = { padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const secondaryButtonStyle = { padding: '10px 20px', background: 'white', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer' };
const downloadButtonStyle = { padding: '6px 12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };