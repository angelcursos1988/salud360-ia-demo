import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generatePatientReport } from '../lib/reportGenerator';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, critical: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Obtenemos pacientes y sus avatars
      const { data, error } = await supabase
        .from('patients')
        .select('*, avatars(health)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
      setStats({
        total: data.length,
        critical: data.filter(p => p.avatars?.[0]?.health < 50).length
      });
    } catch (err) {
      console.error("Error al cargar pacientes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (patient) => {
    try {
      // 1. Consultamos la tabla correcta: chat_history
      const { data: messages, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // 2. Verificamos si hay mensajes antes de intentar el PDF
      if (!messages || messages.length === 0) {
        alert("No se encontraron mensajes en 'chat_history' para este paciente.");
        return;
      }

      // 3. Llamamos al generador
      await generatePatientReport(patient, messages);

    } catch (err) {
      console.error("Error en la descarga:", err);
      alert("Error al obtener el historial de chat.");
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando Panel Médico...</div>;

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <h1>🏥 Panel Médico Salud360</h1>
          <button onClick={() => window.location.href = '/'} style={btnSecondary}>Volver Inicio</button>
        </header>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <div style={cardStyle}><strong>Total:</strong> {stats.total}</div>
          <div style={{...cardStyle, color: 'red'}}><strong>Atención Crítica:</strong> {stats.critical}</div>
        </div>

        <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={tdStyle}>Paciente</th>
                <th style={tdStyle}>Estado</th>
                <th style={tdStyle}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.avatars?.[0]?.health || 100}% Salud</td>
                  <td style={tdStyle}>
                    <button 
                      onClick={() => handleDownload(p)}
                      style={btnPrimary}
                    >
                      📥 Descargar PDF
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

// Estilos
const tdStyle = { padding: '15px', textAlign: 'left' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '8px', flex: 1, textAlign: 'center' };
const btnPrimary = { background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' };
const btnSecondary = { background: '#95a5a6', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' };