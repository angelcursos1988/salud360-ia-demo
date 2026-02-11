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
      // 1. Obtener pacientes y su relación con avatars
      const { data: patientsData, error } = await supabase
        .from('patients')
        .select(`
          *,
          avatars ( health, happiness )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPatients(patientsData);

      // 2. Calcular estadísticas en tiempo real
      const total = patientsData.length;
      const critical = patientsData.filter(p => 
        p.avatars?.[0]?.health < 50
      ).length;
      
      setStats({
        total,
        critical,
        stable: total - critical
      });

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (patient) => {
    try {
      // Obtenemos los mensajes de este paciente específico
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Llamamos al generador de PDF que creamos en el paso anterior
      generatePatientReport(patient, messages || []);
    } catch (error) {
      alert("Error al generar el reporte: " + error.message);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>🏥 Cargando Panel Médico...</h2>
    </div>
  );

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#2c3e50', margin: 0 }}>Panel de Control Médico</h1>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0 0' }}>Salud360 - Gestión de Pacientes e IA</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.location.href = '/'} style={secondaryButtonStyle}>🏠 Volver Inicio</button>
            <button onClick={fetchData} style={primaryButtonStyle}>🔄 Actualizar Datos</button>
        </div>
      </header>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>Pacientes Totales</h3>
          <p style={cardValueStyle}>{stats.total}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>⚠️ Atención Crítica</h3>
          <p style={{ ...cardValueStyle, color: '#e74c3c' }}>{stats.critical}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardLabelStyle}>✅ Estado Estable</h3>
          <p style={{ ...cardValueStyle, color: '#27ae60' }}>{stats.stable}</p>
        </div>
      </div>

      {/* TABLA DE PACIENTES */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
            <tr>
              <th style={thStyle}>Información Paciente</th>
              <th style={thStyle}>Fecha de Registro</th>
              <th style={thStyle}>Salud Avatar</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{patient.name}</div>
                  <div style={{ fontSize: '12px', color: '#95a5a6' }}>ID: {patient.id.split('-')[0]}...</div>
                </td>
                <td style={tdStyle}>
                  {new Date(patient.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={tdStyle}>
                  {patient.avatars?.[0] ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '100px', background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${patient.avatars[0].health}%`, 
                          background: patient.avatars[0].health < 50 ? '#e74c3c' : '#2ecc71',
                          height: '100%' 
                        }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{patient.avatars[0].health}%</span>
                    </div>
                  ) : (
                    <span style={{ color: '#bdc3c7', fontSize: '13px' }}>Sin avatar</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => downloadReport(patient)}
                    style={downloadButtonStyle}
                  >
                    📥 Descargar Informe
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {patients.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#95a5a6' }}>
            <p>No hay pacientes registrados en la base de datos.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ESTILOS EN CONSTANTES
const cardStyle = { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #eaeaea' };
const cardLabelStyle = { fontSize: '13px', color: '#95a5a6', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' };
const cardValueStyle = { fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#2c3e50' };
const thStyle = { padding: '18px 15px', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' };
const tdStyle = { padding: '18px 15px' };
const primaryButtonStyle = { padding: '10px 18px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' };
const secondaryButtonStyle = { padding: '10px 18px', background: 'white', color: '#7f8c8d', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' };
const downloadButtonStyle = { padding: '8px 14px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'background 0.2s' };