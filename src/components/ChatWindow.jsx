import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';

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
      const { data: cData } = await supabase.from('chat_history').select('role, message').eq('patient_id', patientId).order('created_at', { ascending: true });
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
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }, { patient_id: patientId, role: 'assistant', message: data.message }]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // COMPONENTE DE LOGRO ESTILO DASHBOARD MÉDICO
  const AchievementCard = ({ label, value, color, icon, detail }) => (
    <div style={{ 
      background: 'white', 
      padding: '16px', 
      borderRadius: '16px', 
      marginBottom: '12px', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06)',
      border: '1px solid #f1f5f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '10px', background: `${color}15`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' 
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{label}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{detail}</div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: '800', color: color }}>{value}%</div>
      </div>
      <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '10px' }}></div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#f8fafc', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>
      
      {/* PANEL IZQUIERDO ESTILO DASHBOARD */}
      <aside style={{ 
        width: '400px', minWidth: '400px', background: '#f8fafc', 
        borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', 
        padding: '24px', height: '100vh', overflowY: 'auto' 
      }}>
        
        {/* Card del Visualizador */}
        <div style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <BiometricVisualizer patientData={patientData} />
        </div>

        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '16px', letterSpacing: '0.05em', paddingLeft: '4px' }}>
            ESTADO DE OBJETIVOS
          </h4>
          
          <AchievementCard label="Actividad Diaria" detail="Caminar 30 min" value={65} color="#3b82f6" icon="🏃" />
          <AchievementCard label="Hidratación" detail="Consumo de agua" value={90} color="#0ea5e9" icon="💧" />
          <AchievementCard label="Gestión de Estrés" detail="Ejercicios calma" value={42} color="#8b5cf6" icon="🧘" />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '12px' }}>
          <button onClick={() => window.print()} style={{ 
            flex: 1, padding: '14px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', 
            borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            📄 Informe
          </button>
          
          <Link href="/" style={{ flex: 1.5, textDecoration: 'none' }}>
            <button style={{ 
              width: '100%', padding: '14px', background: '#ef4444', color: 'white', 
              border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px'
            }}>
              Finalizar Sesión
            </button>
          </Link>
        </div>
      </aside>

      {/* PANEL DERECHO: CHAT */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        <header style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Consulta Digital</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Paciente: {patientData?.name || 'Cargando...'}</span>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: '#ffffff' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#f1f5f9' : '#ffffff',
              color: '#1e293b',
              padding: '16px 20px', borderRadius: '20px', marginBottom: '16px',
              maxWidth: '75%', marginLeft: msg.role === 'user' ? 'auto' : '0',
              border: '1px solid #f1f5f9',
              boxShadow: msg.role === 'user' ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.02)',
              fontSize: '14px', lineHeight: '1.6'
            }}>
              {msg.message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '24px 32px', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input 
            style={{ flex: 1, padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: '14px' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
          />
          <button type="submit" style={{ 
            background: '#0f172a', color: 'white', border: 'none', 
            padding: '0 32px', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '14px'
          }}>Enviar</button>
        </form>
      </main>
    </div>
  );
}