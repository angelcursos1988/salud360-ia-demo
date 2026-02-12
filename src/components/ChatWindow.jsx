import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const BiometricVisualizer = dynamic(() => import('./BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '300px', background: '#020617', borderRadius: '20px' }} />
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

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* PANEL IZQUIERDO: Visualizador + Retos */}
      <aside style={{ 
        width: '380px', minWidth: '380px', background: 'white', 
        borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', 
        padding: '20px', overflowY: 'auto' 
      }}>
        <BiometricVisualizer patientData={patientData} />

        {/* SECCIÓN DE RETOS */}
        <div style={{ marginTop: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: '800' }}>MIS RETOS SEMANALES</h4>
          <div style={{ fontSize: '13px', color: '#1e293b' }}>
            <div style={{ marginBottom: '8px' }}>🏃 <strong>Caminar 30 min:</strong> En progreso</div>
            <div style={{ marginBottom: '8px' }}>💧 <strong>Beber 2L agua:</strong> Completado</div>
            <div>🧘 <strong>Meditación:</strong> Pendiente</div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => window.print()} style={{ 
            padding: '12px', background: '#0f172a', color: 'white', 
            borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' 
          }}>
            Descargar Informe PDF
          </button>
          
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{ 
              width: '100%', padding: '12px', background: 'white', color: '#ef4444', 
              borderRadius: '8px', border: '1px solid #fca5a5', cursor: 'pointer', fontWeight: '600' 
            }}>
              Terminar Consulta
            </button>
          </Link>
        </div>
      </aside>

      {/* PANEL DERECHO: Chat Ordenado */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <header style={{ padding: '20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Asistente Clínico Salud360</h3>
        </header>

        {/* Contenedor de mensajes con scroll propio */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f8fafc' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#0f172a' : 'white',
              color: msg.role === 'user' ? 'white' : '#334155',
              padding: '12px 18px', borderRadius: '15px', marginBottom: '15px',
              maxWidth: '70%', marginLeft: msg.role === 'user' ? 'auto' : '0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
              lineHeight: '1.5'
            }}>
              {msg.message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input fijo abajo */}
        <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
          <input 
            style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta médica..."
          />
          <button type="submit" style={{ 
            background: '#16a34a', color: 'white', border: 'none', 
            padding: '0 25px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' 
          }}>Enviar</button>
        </form>
      </main>
    </div>
  );
}