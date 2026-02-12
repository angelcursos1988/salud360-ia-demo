import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';

// CARGA DINÁMICA: Esto evita que el panel desaparezca en Vercel/SSR
const BiometricVisualizer = dynamic(() => import('./BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '300px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }} />
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

      if (cData && cData.length > 0) {
        setMessages(cData);
      } else {
        setMessages([{
          role: 'assistant',
          message: `Protocolo iniciado para ${pData?.name || 'paciente'}. Monitoreo biométrico activo.`
        }]);
      }
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
      const contextPrompt = `Eres Soporte Clínico Salud360. Paciente: ${patientData?.name}, Estrés: ${patientData?.stress_level}/10. Tono profesional.`;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, userMessage: userText, systemPrompt: contextPrompt })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
      await supabase.from('chat_history').insert([
        { patient_id: patientId, role: 'user', message: userText },
        { patient_id: patientId, role: 'assistant', message: data.message }
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* PANEL IZQUIERDO: FORZADO A 350px */}
      <aside style={{ 
        width: '350px', 
        minWidth: '350px', 
        background: 'white', 
        borderRight: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '25px',
        height: '100vh'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '5px' }}>MONITOREO BIOMÉTRICO</h3>
          <p style={{ fontSize: '11px', color: '#64748b' }}>Análisis en tiempo real</p>
        </div>
        
        {/* Componente 3D con carga segura */}
        <BiometricVisualizer patientData={patientData} />

        <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>ESTADO CLÍNICO:</div>
          <div style={{ fontSize: '13px', color: '#1e293b' }}>
            <strong>{patientData?.name}</strong><br/>
            {patientData?.age} años | {patientData?.weight} kg
          </div>
        </div>
      </aside>

      {/* PANEL DERECHO: CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '15px 25px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Soporte Clínico Profesional</h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#0f172a' : 'white',
              color: msg.role === 'user' ? 'white' : '#334155',
              padding: '12px 18px', borderRadius: '12px', maxWidth: '80%', fontSize: '14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
            }}>
              {msg.message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
          <input 
            style={{ flex: 1, padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escriba su consulta..."
          />
          <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Enviar</button>
        </form>
      </div>
    </div>
  );
}