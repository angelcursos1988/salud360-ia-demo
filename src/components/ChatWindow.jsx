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

  useEffect(() => { loadAllData(); }, [patientId, selectedDate]);

  // --- LÓGICA DE SALUDO INTELIGENTE REFORZADA ---
  useEffect(() => {
    const triggerSmartGreeting = async () => {
      // Solo actuar cuando ya tenemos los datos del paciente y los logs de comida
      if (!isInitialLoading && patientData && !hasGreeted) {
        setHasGreeted(true);
        
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toLocaleDateString('es-ES');

        // Comprobamos si el último mensaje guardado es de hoy
        const lastMsg = messages[messages.length - 1];
        const lastMsgDate = lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('es-ES') : null;

        if (lastMsgDate !== todayStr) {
          let customPrompt = "¿En qué puedo ayudarte hoy?";
          const hasBreakfast = foodLogs.some(f => f.category === 'Desayuno');
          const hasLunch = foodLogs.some(f => f.category === 'Comida');

          if (hour < 12 && !hasBreakfast) customPrompt = "¡Buenos días! Veo que aún no has registrado el desayuno, ¿qué has tomado?";
          else if (hour >= 14 && hour < 18 && !hasLunch) customPrompt = "Hola, ¿ya has almorzado? No olvides registrarlo para tu seguimiento.";
          else if (hour >= 21) customPrompt = "¿Qué tal ha ido el día? ¿Hay cambios en tu cena que deba anotar?";

          setLoading(true);
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                patientId, 
                userMessage: "[SALUDO_INICIAL_SISTEMA]", 
                systemPrompt: `Eres Salud360. Saluda a ${patientData.name} y obligatoriamente hazle esta pregunta: ${customPrompt}` 
              })
            });
            const data = await res.json();
            if (data.message) {
              const newMsg = { role: 'assistant', message: data.message, created_at: new Date().toISOString() };
              setMessages(prev => [...prev, newMsg]);
              // Guardamos el saludo en el historial para que no se repita
              await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'assistant', message: data.message }]);
            }
          } catch (e) { console.error(e); } finally { setLoading(false); }
        }
      }
    };
    triggerSmartGreeting();
  }, [isInitialLoading, patientData, messages.length]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- RENDERIZADO DE MENSAJES CON SEPARADORES ---
  const renderMessagesWithDates = () => {
    let lastDate = null;
    return messages.map((msg, idx) => {
      const dateObj = new Date(msg.created_at);
      const msgDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      const showSeparator = msgDate !== lastDate;
      lastDate = msgDate;

      return (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {showSeparator && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ padding: '0 15px', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{msgDate}</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>
          )}
          <div style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
            background: msg.role === 'user' ? '#f1f5f9' : '#ffffff', 
            padding: '16px 20px', 
            borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
            marginBottom: '16px', 
            maxWidth: '80%', 
            marginLeft: msg.role === 'user' ? 'auto' : '0', 
            border: '1px solid #f1f5f9', 
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '6px', textAlign: 'right', fontWeight: '600' }}>
              {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      );
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    const now = new Date().toISOString();
    setMessages(prev => [...prev, { role: 'user', message: userText, created_at: now }]);
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

  // Mantenemos el panel izquierdo igual
  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const imcReal = (heightCm > 0) ? (weight / ((heightCm / 100) ** 2)).toFixed(1) : "0.0";
  const imcIdeal = 22.0;
  const recCalories = Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500);
  const dailyTotal = foodLogs.reduce((acc, curr) => acc + curr.calories, 0);
  const targets = { Desayuno: Math.round(recCalories*0.2), Almuerzo: Math.round(recCalories*0.1), Comida: Math.round(recCalories*0.35), Merienda: Math.round(recCalories*0.1), Cena: Math.round(recCalories*0.2), Otros: Math.round(recCalories*0.05) };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      {/* ASIDE IZQUIERDO */}
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        <div style={{ minHeight: '350px', borderRadius: '24px', overflow: 'hidden', marginBottom: '15px', background: '#020617' }}>
          <BiometricVisualizer patientData={patientData || { weight: 70, stress_level: 5 }} />
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '24px', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'center' }}>
            <div><div style={{ fontSize: '9px', color: '#94a3b8' }}>IMC REAL / IDEAL</div><div style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24' }}>{imcReal} / {imcIdeal}</div></div>
            <div><div style={{ fontSize: '9px', color: '#94a3b8' }}>KCAL META</div><div style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e' }}>{recCalories}</div></div>
          </div>
          <div style={{ background: '#0f172a', padding: '12px', borderRadius: '16px' }}>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', background: 'transparent', color: 'white', border: 'none', textAlign: 'center', fontWeight: '700' }} />
          </div>
          {selectedDate === new Date().toISOString().split('T')[0] && <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(targets).map(cat => (
              <details key={cat} style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid #334155' }}>
                <summary style={{ padding: '12px', cursor: 'pointer', fontSize: '12px', display:'flex', justifyContent:'space-between' }}>
                   <span>{cat}</span>
                   <span>{foodLogs.filter(f => f.category === cat).reduce((acc, curr) => acc + curr.calories, 0)} / {targets[cat]}</span>
                </summary>
              </details>
            ))}
          </div>
        </div>
      </aside>

      {/* CHAT DERECHA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {renderMessagesWithDates()}
          {loading && <div style={{ fontSize: '11px', color: '#94a3b8', padding: '10px' }}>Salud360 analizando datos...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe aquí..." />
          <button type="submit" disabled={loading} style={{ background: '#22c55e', color: 'white', padding: '0 30px', borderRadius: '16px', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Enviar</button>
        </form>
      </main>
    </div>
  );
}