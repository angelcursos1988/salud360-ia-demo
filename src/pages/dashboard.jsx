import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generatePatientReport } from '../lib/reportGenerator';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*, avatars(health)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (patient) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!messages || messages.length === 0) {
        alert("El paciente no tiene historial de chats.");
        return;
      }

      await generatePatientReport(patient, messages);
    } catch (err) {
      alert("Error en la conexión con la base de datos.");
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando datos médicos...</div>;

  return (
    <div style={{ padding: '40px', background: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* HEADER CON LOGO */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }} />
            <h1 style={{ color: '#2c3e50', margin: 0 }}>Panel de Control Salud360</h1>
          </div>
          <button onClick={() => window.location.href = '/'} style={btnSecondary}>🏠 Volver al Inicio</button>
        </header>

        {/* TABLA DE PACIENTES */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={thStyle}>Paciente</th>
                <th style={thStyle}>Estado Vital</th>
                <th style={thStyle}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>
                    <strong>{p.name}</strong><br/>
                    <small style={{ color: '#999' }}>{p.id.slice(0, 8)}</small>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '12px',
                      background: p.avatars?.[0]?.health > 50 ? '#e3f9e5' : '#fee2e2',
                      color: p.avatars?.[0]?.health > 50 ? '#27ae60' : '#ef4444'
                    }}>
                      Salud: {p.avatars?.[0]?.health || 100}%
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => downloadReport(p)} style={btnDownload}>
                      📥 Descargar Informe PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Estilos rápidos
const thStyle = { padding: '20px', textAlign: 'left', color: '#7f8c8d', fontSize: '14px' };
const tdStyle = { padding: '20px' };
const btnDownload = { background: '#16a085', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const btnSecondary = { background: 'white', border: '1px solid #ddd', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' };