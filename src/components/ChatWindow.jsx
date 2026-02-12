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
<<<<<<< HEAD
=======
  const [dailyCalories, setDailyCalories] = useState(0); 
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
  const [foodLogs, setFoodLogs] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef(null);

  const loadAllData = async () => {
    if (!patientId) return;
    try {
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);
<<<<<<< HEAD

      const { data: cData } = await supabase.from('chat_history').select('role, message')
        .eq('patient_id', patientId).order('created_at', { ascending: true });
      if (cData) setMessages(cData);

      const today = new Date().toISOString().split('T')[0];
      const { data: fData } = await supabase.from('food_logs').select('*').eq('patient_id', patientId).gte('created_at', today);
      if (fData) setFoodLogs(fData);
    } catch (err) { console.error(err); } finally { setIsInitialLoading(false); }
  };

  useEffect(() => {
    const triggerGreeting = async () => {
      if (!isInitialLoading && patientData && !hasGreeted) {
        setHasGreeted(true);
        const today = new Date().toISOString().split('T')[0];
        const { data: lastMsg } = await supabase.from('chat_history').select('created_at')
          .eq('patient_id', patientId).order('created_at', { descending: true }).limit(1);

        if (!lastMsg?.[0] || lastMsg[0].created_at.split('T')[0] !== today) {
          setLoading(true);
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patientId, userMessage: "[SALUDO_INICIAL_SISTEMA]", systemPrompt: `Nombre: ${patientData.name}` })
            });
            const data = await res.json();
            if (data.message) setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
          } catch (e) { console.error(e); } finally { setLoading(false); }
        }
      }
=======

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
                systemPrompt: `Paciente: ${patientData.name}. Primer contacto del día.`
              })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
          } catch (e) { console.error(e); } finally { setLoading(false); }
        }
      }
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
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
      // Guardar mensaje de usuario en Supabase
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: `Paciente: ${patientData?.name}. Peso: ${patientData?.weight}kg.`
        })
      });
<<<<<<< HEAD
      
      const data = await response.json();
      let aiText = data.message || "Lo siento, tuve un problema al procesar tu mensaje.";

      // Procesar actualizaciones biométricas
      const updateMatch = aiText.match(/\[UPDATE:(.*?)\]/);
      if (updateMatch) {
        const updates = {};
        updateMatch[1].split(',').forEach(p => {
          const [k, v] = p.split('=');
=======
      const data = await response.json();
      let aiResponseText = data.message;

      const updateMatch = aiResponseText.match(/\[UPDATE:(.*?)\]/);
      if (updateMatch) {
        const updates = {};
        updateMatch[1].split(',').forEach(pair => {
          const [k, v] = pair.split('=');
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
          if (v !== 'XX' && !isNaN(v)) updates[k] = parseFloat(v);
        });
        if (Object.keys(updates).length > 0) {
          await supabase.from('patients').update(updates).eq('id', patientId);
<<<<<<< HEAD
=======
          await supabase.from('health_logs').insert([{ patient_id: patientId, ...updates }]);
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
          loadAllData();
        }
      }

<<<<<<< HEAD
      const cleanText = aiText.replace(/\[UPDATE:.*?\]/g, '').replace(/\[RETO:.*?\]/g, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', message: cleanText }]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
=======
      const cleanText = aiResponseText.replace(/\[UPDATE:.*?\]/g, '').replace(/\[RETO:.*?\]/g, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', message: cleanText }]);
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // Lógica nutricional
  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const imcReal = (heightCm > 0) ? (weight / ((heightCm / 100) ** 2)).toFixed(1) : "0.0";
  const recCalories = Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500);

  const targets = {
    Desayuno: Math.round(recCalories * 0.20),
    Almuerzo: Math.round(recCalories * 0.10),
    Comida: Math.round(recCalories * 0.35),
    Merienda: Math.round(recCalories * 0.10),
    Cena: Math.round(recCalories * 0.20),
    Otros: Math.round(recCalories * 0.05)
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
  };

  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const recCalories = Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500);
  const dailyTotal = foodLogs.reduce((acc, curr) => acc + curr.calories, 0);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        <div style={{ minHeight: '350px', borderRadius: '24px', overflow: 'hidden', marginBottom: '15px', background: '#020617' }}>
          <BiometricVisualizer patientData={patientData || { weight: 70, stress_level: 5 }} />
<<<<<<< HEAD
        </div>

        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />

        {/* --- BOTONES RESTAURADOS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
          <button 
            onClick={() => window.print()}
            style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
          >
            📄 Informe
          </button>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
              🚪 Salir
            </button>
          </Link>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800' }}>
             <span>DIETA DIARIA</span>
             <span>{dailyTotal} / {recCalories} kcal</span>
           </div>
           <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px', marginTop: '8px' }}>
             <div style={{ width: `${Math.min((dailyTotal / recCalories) * 100, 100)}%`, height: '100%', background: '#22c55e', borderRadius: '10px' }} />
=======
        </div>

        <div style={{ background: '#1e293b', padding: '18px', borderRadius: '20px', marginBottom: '15px', color: 'white', textAlign: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div><div style={{ fontSize: '10px', color: '#94a3b8' }}>IMC ACTUAL</div><div style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24' }}>{imcReal}</div></div>
            <div><div style={{ fontSize: '10px', color: '#94a3b8' }}>CALORÍAS OBJETIVO</div><div style={{ fontSize: '20px', fontWeight: '900', color: '#22c55e' }}>{recCalories}</div></div>
          </div>
        </div>

        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />

        {/* --- DESPLEGABLE DE COMIDAS RESTAURADO --- */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '12px' }}>DESGLOSE DIARIO</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(targets).map((cat) => {
              const catItems = foodLogs.filter(f => f.category === cat);
              const catTotal = catItems.reduce((acc, curr) => acc + curr.calories, 0);
              const target = targets[cat];
              return (
                <details key={cat} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <summary style={{ listStyle: 'none', padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{cat}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Meta: {target} kcal</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: catTotal > target ? '#ef4444' : '#22c55e' }}>
                      {catTotal} kcal
                    </div>
                  </summary>
                  <div style={{ padding: '10px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    {catItems.length > 0 ? catItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
                        <span style={{ color: '#475569' }}>{item.description}</span>
                        <span style={{ fontWeight: '700' }}>{item.calories}</span>
                      </div>
                    )) : <div style={{ fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic' }}>Sin registros</div>}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '15px', border: '2px solid #e2e8f0' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
             <span>CONSUMIDO</span>
             <span>{dailyCalories} / {recCalories} kcal</span>
           </div>
           <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', marginTop: '8px', overflow: 'hidden' }}>
             <div style={{ width: `${Math.min((dailyCalories / recCalories) * 100, 100)}%`, height: '100%', background: dailyCalories > recCalories ? '#ef4444' : '#22c55e', transition: 'width 0.5s' }} />
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
           </div>
        </div>
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
<<<<<<< HEAD
          {loading && <div style={{ fontSize: '12px', color: '#94a3b8', padding: '10px' }}>Salud360 respondiendo...</div>}
=======
          {loading && <div style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '20px' }}>Salud360 está analizando...</div>}
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input 
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
            value={input} onChange={(e) => setInput(e.target.value)}
<<<<<<< HEAD
            placeholder="Escribe aquí..."
=======
            placeholder="Escribe un mensaje..."
>>>>>>> b7067bcdeea9ae363e6d16a97a460b8e5b7a4980
          />
          <button type="submit" disabled={loading} style={{ background: '#22c55e', color: 'white', padding: '0 25px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>
            Enviar
          </button>
        </form>
      </main>
    </div>
  );
}