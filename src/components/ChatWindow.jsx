import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FoodTracker from './FoodTracker';

const BiometricVisualizer = dynamic(() => import('./BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '350px', background: '#020617', borderRadius: '24px' }} />
});

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [dailyCalories, setDailyCalories] = useState(0); 
  const [foodLogs, setFoodLogs] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef(null);

  const loadAllData = async () => {
    if (!patientId) return;
    try {
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      const { data: cData } = await supabase.from('chat_history')
        .select('role, message')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });
      if (cData) setMessages(cData);

      const today = new Date().toISOString().split('T')[0];
      const { data: fData } = await supabase.from('food_logs').select('*').eq('patient_id', patientId).gte('created_at', today);
      if (fData) {
        setFoodLogs(fData);
        setDailyCalories(fData.reduce((acc, curr) => acc + curr.calories, 0) || 0);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    const triggerGreeting = async () => {
      if (!isInitialLoading && patientData && !hasGreeted) {
        setHasGreeted(true);
        const today = new Date().toISOString().split('T')[0];
        
        const { data: lastMsg } = await supabase.from('chat_history')
          .select('created_at').eq('patient_id', patientId)
          .order('created_at', { descending: true }).limit(1);

        const lastMsgDate = lastMsg?.[0]?.created_at?.split('T')[0];
        
        if (lastMsgDate !== today) {
          setLoading(true);
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                patientId, 
                userMessage: "[SALUDO_INICIAL_SISTEMA]", 
                systemPrompt: `Paciente: ${patientData.name}. Es el primer contacto del día.`
              })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
          } catch (e) { console.error(e); } finally { setLoading(false); }
        }
      }
    };
    triggerGreeting();
  }, [isInitialLoading, patientData]);

  useEffect(() => { loadAllData(); }, [patientId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: `Paciente: ${patientData?.name}. Peso: ${patientData?.weight}kg.`
        })
      });
      
      const data = await response.json();
      let aiResponseText = data.message;

      // 1. Procesar Actualizaciones Biométricas Ocultas
      const updateMatch = aiResponseText.match(/\[UPDATE:(.*?)\]/);
      if (updateMatch) {
        const updates = {};
        updateMatch[1].split(',').forEach(pair => {
          const [k, v] = pair.split('=');
          if (v !== 'XX' && !isNaN(v)) updates[k] = parseFloat(v);
        });
        if (Object.keys(updates).length > 0) {
          await supabase.from('patients').update(updates).eq('id', patientId);
          await supabase.from('health_logs').insert([{ patient_id: patientId, ...updates }]);
          loadAllData();
        }
      }

      // 2. Limpiar TODAS las etiquetas del texto para el usuario
      const cleanText = aiResponseText
        .replace(/\[UPDATE:.*?\]/g, '')
        .replace(/\[RETO:.*?\]/g, '')
        .trim();

      setMessages(prev => [...prev, { role: 'assistant', message: cleanText }]);
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }]);
      
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const imcReal = (heightCm > 0) ? (weight / ((heightCm / 100) ** 2)).toFixed(1) : "0.0";
  const recCalories = Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        <div style={{ minHeight: '350px', borderRadius: '24px', overflow: 'hidden', marginBottom: '15px', background: '#020617' }}>
          <BiometricVisualizer patientData={patientData || { weight: 70, stress_level: 5 }} />
        </div>

        <div style={{ background: '#1e293b', padding: '18px', borderRadius: '20px', marginBottom: '15px', color: 'white', textAlign: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div><div style={{ fontSize: '10px', color: '#94a3b8' }}>IMC ACTUAL</div><div style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24' }}>{imcReal}</div></div>
            <div><div style={{ fontSize: '10px', color: '#94a3b8' }}>CALORÍAS OBJETIVO</div><div style={{ fontSize: '20px', fontWeight: '900', color: '#22c55e' }}>{recCalories}</div></div>
          </div>
        </div>

        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#f1f5f9' : '#ffffff',
              padding: '16px 20px', borderRadius: '20px', marginBottom: '16px',
              maxWidth: '85%', marginLeft: msg.role === 'user' ? 'auto' : '0',
              border: '1px solid #f1f5f9', fontSize: '14px'
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
            </div>
          ))}
          {loading && <div style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '20px' }}>Salud360 está analizando...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input 
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
          />
          <button type="submit" disabled={loading} style={{ background: '#22c55e', color: 'white', padding: '0 25px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>
            Enviar
          </button>
        </form>
      </main>
    </div>
  );
}
