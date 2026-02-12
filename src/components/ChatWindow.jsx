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

      const { data: cData } = await supabase.from('chat_history').select('role, message').eq('patient_id', patientId).order('created_at', { ascending: true });
      if (cData) setMessages(cData || []);

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
      if (!isInitialLoading && patientData && messages.length === 0 && !hasGreeted) {
        setHasGreeted(true);
        setLoading(true);
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data: healthLogs } = await supabase.from('health_logs').select('*').eq('patient_id', patientId).gte('created_at', today);
          const hasWeighedToday = healthLogs && healthLogs.length > 0;

          const systemInstruction = hasWeighedToday 
            ? "Saluda breve y profesional, pregunta si hay alguna novedad importante."
            : "Da la bienvenida. Pregunta si se ha pesado hoy, cómo organizará su día y recuerda registrar comidas.";

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              patientId, 
              userMessage: "[SALUDO_INICIAL_SISTEMA]", 
              systemPrompt: `Eres Salud360. Paciente: ${patientData.name}. Instrucción: ${systemInstruction}`
            })
          });

          const data = await response.json();
          const aiMessage = { role: 'assistant', message: data.message };
          setMessages([aiMessage]);
          await supabase.from('chat_history').insert([{ patient_id: patientId, ...aiMessage }]);
        } catch (error) {
          console.error("Error saludo inicial:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    triggerGreeting();
  }, [isInitialLoading, patientData, messages.length]);

  useEffect(() => { loadAllData(); }, [patientId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- LÓGICA NUTRICIONAL ---
  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const imcReal = (heightCm > 0) ? (weight / ((heightCm / 100) ** 2)).toFixed(1) : "0.0";
  const imcIdeal = 22.0;
  const recCalories = patientData ? Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500) : 2000; 

  const targets = {
    Desayuno: Math.round(recCalories * 0.20),
    Almuerzo: Math.round(recCalories * 0.10),
    Comida: Math.round(recCalories * 0.35),
    Merienda: Math.round(recCalories * 0.10),
    Cena: Math.round(recCalories * 0.20),
    Otros: Math.round(recCalories * 0.05)
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    const newUserMsg = { role: 'user', message: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: `Eres un asistente clínico. Si el usuario menciona peso, sueño o estrés, añade al final: [UPDATE:weight=XX,sleep_hours=XX,stress_level=XX]. Paciente: ${patientData?.name}. IMC: ${imcReal}.`
        })
      });
      
      const data = await response.json();
      let aiResponseText = data.message;

      // --- EXTRACCIÓN Y ACTUALIZACIÓN DE DATOS ---
      if (aiResponseText.includes('[UPDATE:')) {
        const match = aiResponseText.match(/\[UPDATE:(.*?)\]/);
        if (match) {
          const updateStr = match[1];
          const updates = {};
          updateStr.split(',').forEach(item => {
            const [key, val] = item.split('=');
            if (val !== 'XX') updates[key] = parseFloat(val);
          });

          if (Object.keys(updates).length > 0) {
            // Actualizar tabla principal
            await supabase.from('patients').update(updates).eq('id', patientId);
            // Insertar en historial para gráficas
            await supabase.from('health_logs').insert([{ patient_id: patientId, ...updates }]);
            // Recargar datos para actualizar visualizador e IMC
            await loadAllData();
          }
          // Limpiar el código del mensaje para que el usuario no lo vea
          aiResponseText = aiResponseText.replace(/\[UPDATE:.*?\]/, '').trim();
        }
      }

      const aiMsg = { role: 'assistant', message: aiResponseText };
      setMessages(prev => [...prev, aiMsg]);
      await supabase.from('chat_history').insert([
        { patient_id: patientId, ...newUserMsg }, 
        { patient_id: patientId, ...aiMsg }
      ]);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        
        <div style={{ minHeight: '350px', height: '350px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '15px', background: '#020617', position: 'relative' }}>
          <BiometricVisualizer patientData={patientData || { weight: 70, stress_level: 5 }} />
        </div>

        <div style={{ background: '#1e293b', padding: '18px', borderRadius: '20px', marginBottom: '15px', color: 'white' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>IMC REAL</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24' }}>{imcReal}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>IMC IDEAL</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#22c55e' }}>{imcIdeal}</div>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>RECOMENDACIÓN DIARIA</div>
            <div style={{ fontSize: '16px', fontWeight: '800' }}>🔥 {recCalories} kcal / día</div>
          </div>
        </div>

        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />

        <div style={{ marginTop: '10px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '12px', letterSpacing: '0.5px' }}>DESGLOSE VS OBJETIVO</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(targets).map((cat) => {
              const catItems = foodLogs.filter(f => f.category === cat);
              const catTotal = catItems.reduce((acc, curr) => acc + curr.calories, 0);
              const target = targets[cat];
              return (
                <details key={cat} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <summary style={{ listStyle: 'none', padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{cat}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Obj: {target} kcal</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: catTotal > target ? '#ef4444' : '#22c55e' }}>
                      {catTotal} kcal
                    </div>
                  </summary>
                  <div style={{ padding: '0 14px 12px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    {catItems.length > 0 ? catItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px', borderBottom: i === catItems.length -1 ? 'none' : '1px dashed #e2e8f0' }}>
                        <span style={{ color: '#475569' }}>{item.description}</span>
                        <span style={{ fontWeight: '700' }}>{item.calories}</span>
                      </div>
                    )) : <div style={{ padding: '8px 0', fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic' }}>Sin registros</div>}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '18px', background: 'white', borderRadius: '20px', border: '2px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '13px', color: '#64748b' }}>CONSUMO TOTAL</span>
            <span style={{ fontWeight: '900', fontSize: '18px', color: dailyCalories > recCalories ? '#ef4444' : '#0f172a' }}>
              {dailyCalories} <small style={{fontSize: '11px', color: '#94a3b8', fontWeight: '400'}}> / {recCalories} kcal</small>
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '10px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${Math.min((dailyCalories / recCalories) * 100, 100)}%`, 
              height: '100%', 
              background: dailyCalories > recCalories ? '#ef4444' : '#22c55e',
              transition: 'width 0.8s ease'
            }} />
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', paddingTop: '20px' }}>
          <Link href="/dashboard" style={{ flex: 1 }}>
            <button style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>Panel Médico</button>
          </Link>
          <button onClick={() => window.location.href='/'} style={{ flex: 1, padding: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>Salir</button>
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
              border: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b'
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
            </div>
          ))}
          {loading && <div style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '20px' }}>Salud360 está pensando...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px', background: 'white' }}>
          <input 
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: '14px' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={loading}
          />
          <button type="submit" disabled={loading} style={{ background: '#22c55e', color: 'white', padding: '0 25px', borderRadius: '14px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
            {loading ? '...' : 'Enviar'}
          </button>
        </form>
      </main>
    </div>
  );
}