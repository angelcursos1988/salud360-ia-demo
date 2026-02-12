import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// CARGA DINÁMICA DEL VISUALIZADOR
const BiometricVisualizer = dynamic(() => import('./BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '350px', background: '#020617', borderRadius: '20px' }} />
});

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadAllData = async () => {
      if (!patientId) return;
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      const { data: cData } = await supabase
        .from('chat_history').select('role, message')
        .eq('patient_id', patientId).order('created_at', { ascending: true });

      if (cData && cData.length > 0) setMessages(cData);
    };
    loadAllData();
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userText }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, userMessage: userText })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
      await supabase.from('chat_history').insert([
        { patient_id: patientId, role: 'user', message: userText },
        { patient_id: patientId, role: 'assistant', message: data.message }
      ]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // Componente interno para las barras de progreso estéticas
  const ProgressBar = ({ label, value, color, icon }) => (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', fontWeight: '600' }}>
        <span>{icon} {label}</span>
        <span>{value}%</span>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '10px', transition: 'width 1s ease-in-out' }}></div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* PANEL IZQUIERDO: BIOMETRÍA Y PROGRESO ESTÉTICO */}
      <aside style={{ 
        width: '380px', minWidth: '380px', background: 'white', 
        borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', 
        padding: '20px', height: '100vh', overflowY: 'auto' 
      }}>
        <BiometricVisualizer patientData={patientData} />

        <div style={{ marginTop: '25px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '15px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Progreso de Objetivos
          </h4>
          
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <ProgressBar label="Actividad Física" value={65} color="#3b82f6" icon="🏃" />
            <ProgressBar label="Hidratación" value={90} color="#0ea5e9" icon="💧" />
            <ProgressBar label="Control de Estrés" value={40} color="#8b5cf6" icon="🧘" />
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => window.print()} style={{ 
            padding: '14px', background: '#0f172a', color: 'white', border: 'none', 
            borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            Descargar Informe Médico
          </button>
          
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{ 
              width: '100%', padding: '14px', background: 'white', color: '#ef4444', 
              border: '1px solid #fee2e2', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px'
            }}>
              Terminar Consulta
            </button>
          </Link>
        </div>
      </aside>

      {/* PANEL DERECHO: CHAT */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <header style={{ padding: '20px 30px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Asistente Clínico Inteligente</h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Paciente en línea: {patientData?.name}</p>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '30px', background: '#f8fafc' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#0f172a' : 'white',
              color: msg.role === 'user' ? 'white' : '#334155',
              padding: '14px 20px', borderRadius: '15px', marginBottom: '15px',
              maxWidth: '70%', marginLeft: msg.role === 'user' ? 'auto' : '0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
              lineHeight: '1.6'
            }}>
              {msg.message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '25px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
          <input 
            style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escriba su consulta..."
          />
          <button type="submit" style={{ 
            background: '#16a34a', color: 'white', border: 'none', 
            padding: '0 25px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' 
          }}>Enviar</button>
        </form>
      </main>
    </div>
  );
}