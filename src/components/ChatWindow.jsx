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
  const [foodLogs, setFoodLogs] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const messagesEndRef = useRef(null);

  const loadAllData = async () => {
    if (!patientId) return;
    try {
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      // Traer historial con fecha de creación
      const { data: cData } = await supabase.from('chat_history')
        .select('role, message, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });
      if (cData) setMessages(cData);

      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;
      const { data: fData } = await supabase.from('food_logs').select('*')
        .eq('patient_id', patientId).gte('created_at', startOfDay).lte('created_at', endOfDay);
      if (fData) setFoodLogs(fData);
    } catch (err) { console.error(err); } finally { setIsInitialLoading(false); }
  };

  // Lógica de Saludo Inteligente por Horas y Registros
  useEffect(() => {
    const triggerSmartGreeting = async () => {
      if (!isInitialLoading && patientData && !hasGreeted) {
        setHasGreeted(true);
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toISOString().split('T')[0];

        // Verificar si ya hubo interacción HOY
        const { data: todayMsgs } = await supabase.from('chat_history')
          .select('id')
          .eq('patient_id', patientId)
          .gte('created_at', `${todayStr}T00:00:00Z`)
          .limit(1);

        if (todayMsgs?.length === 0) {
          // Determinar qué preguntar según la hora y lo que falta por registrar
          let contextPrompt = "¿Qué necesitas?";
          const hasLunch = foodLogs.some(f => f.category === 'Comida');
          const hasBreakfast = foodLogs.some(f => f.category === 'Desayuno');

          if (hour < 12 && !hasBreakfast) contextPrompt = "¡Buenos días! Veo que aún no has registrado el desayuno, ¿qué has tomado?";
          else if (hour >= 14 && hour < 17 && !hasLunch) contextPrompt = "Buenas tardes, ¿ya has almorzado? No olvides registrarlo para tu seguimiento.";
          else if (hour >= 21) contextPrompt = "¿Qué tal ha ido el día? ¿Hay algún cambio en tu cena o biometría que deba saber?";

          setLoading(true);
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                patientId, 
                userMessage: `[CONTEXTO_HORA:${hour}, FALTA_REGISTRO:${contextPrompt}]`, 
                systemPrompt: `Eres Salud360. Saluda al paciente ${patientData.name} de forma humana y pregúntale: ${contextPrompt}` 
              })
            });
            const data = await res.json();
            if (data.message) setMessages(prev => [...prev, { role: 'assistant', message: data.message, created_at: new Date().toISOString() }]);
          } catch (e) { console.error(e); } finally { setLoading(false); }
        }
      }
    };
    triggerSmartGreeting();
  }, [isInitialLoading, patientData, foodLogs]);

  useEffect(() => { loadAllData(); }, [patientId, selectedDate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Función para agrupar mensajes por fecha
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  // ... (handleSendMessage se mantiene igual que antes) ...
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userText, created_at: new Date().toISOString() }]);
    setLoading(true);
    try {
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }]);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, userMessage: userText, systemPrompt: `Paciente: ${patientData?.name}.` })
      });
      const data = await response.json();
      const cleanText = (data.message || "").replace(/\[UPDATE:.*?\]/g, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', message: cleanText, created_at: new Date().toISOString() }]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const imcReal = (heightCm > 0) ? (weight / ((heightCm / 100) ** 2)).toFixed(1) : "0.0";
  const imcIdeal = 22.0;
  const recCalories = Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500);
  const dailyTotal = foodLogs.reduce((acc, curr) => acc + curr.calories, 0);
  const targets = { Desayuno: 400, Almuerzo: 200, Comida: 700, Merienda: 200, Cena: 400, Otros: 100 };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f1f5f9', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        <div style={{ minHeight: '350px', borderRadius: '24px', overflow: 'hidden', marginBottom: '15px', background: '#020617' }}>
          <BiometricVisualizer patientData={patientData || { weight: 70, stress_level: 5 }} />
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '24px', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'center' }}>
            <div><div style={{ fontSize: '9px', color: '#94a3b8' }}>IMC REAL/IDEAL</div><div style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24' }}>{imcReal}/{imcIdeal}</div></div>
            <div><div style={{ fontSize: '9px', color: '#94a3b8' }}>KCAL META</div><div style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e' }}>{recCalories}</div></div>
          </div>
          <div style={{ background: '#0f172a', padding: '12px', borderRadius: '16px' }}>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', background: 'transparent', color: 'white', border: 'none', textAlign: 'center', fontWeight: '700' }} />
          </div>
          {selectedDate === new Date().toISOString().split('T')[0] && <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(targets).map(cat => (
              <details key={cat} style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                <summary style={{ padding: '10px', fontSize: '12px', cursor: 'pointer' }}>{cat} - {foodLogs.filter(f => f.category === cat).reduce((a,b)=>a+b.calories,0)} kcal</summary>
              </details>
            ))}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {Object.keys(groupedMessages).map(date => (
            <div key={date}>
              {/* SEPARADOR DE FECHA */}
              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <span style={{ background: '#f1f5f9', padding: '5px 15px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>{date}</span>
              </div>
              {groupedMessages[date].map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#f1f5f9' : '#ffffff', padding: '16px 20px', borderRadius: '20px', marginBottom: '16px', maxWidth: '85%', marginLeft: msg.role === 'user' ? 'auto' : '0', border: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '5px', textAlign: 'right' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {loading && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Escribiendo...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="¿En qué puedo ayudarte?" />
          <button type="submit" style={{ background: '#22c55e', color: 'white', padding: '0 30px', borderRadius: '16px', border: 'none', fontWeight: '700' }}>Enviar</button>
        </form>
      </main>
    </div>
  );
}