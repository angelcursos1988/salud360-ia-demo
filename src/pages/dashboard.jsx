import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function MedicalDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error) setPatients(data);
    setLoading(false);
  };

  const getStressColor = (level) => {
    if (level > 7) return '#e74c3c'; // Rojo - Alerta
    if (level > 4) return '#f1c40f'; // Amarillo - Precaución
    return '#27ae60'; // Verde - Normal
  };

  return (
    <div style={{ padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div>
            <h1 style={{ color: '#2c3e50', margin: 0 }}>Panel de Control Médico</h1>
            <p style={{ color: '#64748b' }}>Seguimiento en tiempo real de pacientes</p>
          </div>
          <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </header>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f1f5f9', color: '#475569', fontSize: '14px' }}>
              <tr>
                <th style={{ padding: '15px' }}>Paciente</th>
                <th style={{ padding: '15px' }}>Estado (Peso/Edad)</th>
                <th style={{ padding: '15px' }}>Estrés</th>
                <th style={{ padding: '15px' }}>Sueño</th>
                <th style={{ padding: '15px' }}>Última Actividad</th>
                <th style={{ padding: '15px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{p.health_goal}</div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    {p.weight}kg / {p.age} años
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                      background: getStressColor(p.stress_level) + '20', color: getStressColor(p.stress_level)
                    }}>
                      Nivel {p.stress_level}/10
                    </span>
                  </td>
                  <td style={{ padding: '15px' }}>{p.sleep_hours}h</td>
                  <td style={{ padding: '15px', color: '#64748b', fontSize: '13px' }}>
                    {new Date(p.updated_at || p.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <button 
                      onClick={() => router.push(`/chat?id=${p.id}`)}
                      style={{ background: '#3182ce', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Ver Chat
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