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
      // 1. Cargar datos del paciente
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      // 2. Cargar historial (Solo los últimos mensajes para no saturar)
      const { data: cData } = await supabase.from('chat_history')
        .select('role, message')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });
      
      if (cData) setMessages(cData);

      // 3. Cargar logs de comida de hoy
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

  // --- LÓGICA DE SALUDO MEJORADA ---
  useEffect(() => {
    const triggerGreeting = async () => {
      // Si ya está cargado, tenemos datos y NO hemos saludado aún en esta carga de página
      if (!isInitialLoading && patientData && !hasGreeted) {
        setHasGreeted(true); // Bloqueamos para que no se repita el loop

        const today = new Date().toISOString().split('T')[0];
        
        // Verificamos si el último mensaje guardado es de HOY
        // Si hay mensajes de días anteriores, podríamos querer limpiar el chat visualmente
        const { data: lastMsg } = await supabase
          .from('chat_history')
          .select('created_at')
          .eq('patient_id', patientId)
          .order('created_at', { descending: true })
          .limit(1);

        const lastMsgDate = lastMsg?.[0]?.created_at?.split('T')[0];
        
        // SOLO saludamos automáticamente si no hay mensajes hoy
        if (lastMsgDate !== today) {
          setLoading(true);
          try {
            // Comprobamos si se ha pesado hoy
            const { data: healthLogs } = await supabase.from('health_logs').select('*').eq('patient_id', patientId).gte('created_at', today);
            const hasWeighedToday = healthLogs && healthLogs.length > 0;

            const systemInstruction = hasWeighedToday 
              ? "El usuario ya se pesó. Saluda breve y pregunta si hay alguna novedad importante."
              : "Bienvenida inicial: Pregunta si se ha pesado hoy, cómo organizará su día y recuerda registrar comidas.";

            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                patientId, 
                userMessage: "[SALUDO_INICIAL_SISTEMA]", 
                systemPrompt: `Paciente: ${patientData.name}. ${systemInstruction}`
              })
            });

            const data = await response.json();
            const aiMessage = { role: 'assistant', message: data.message };
            
            // Añadimos el saludo al estado y a la base de datos
            setMessages(prev => [...prev, aiMessage]);
          } catch (error) {
            console.error("Error en saludo:", error);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    triggerGreeting();
  }, [isInitialLoading, patientData]);

  useEffect(() => { loadAllData(); }, [patientId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- LÓGICA DE ENVÍO DE MENSAJES ---
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
          systemPrompt: `Paciente: ${patientData?.name}. Peso actual: ${patientData?.weight}kg. Si menciona cambios biométricos usa [UPDATE:weight=XX,stress_level=XX].`
        })
      });
      
      const data = await response.json();
      let aiResponseText = data.message;

      // Procesar etiquetas UPDATE si existen
      if (aiResponseText.includes('[UPDATE:')) {
        const match = aiResponseText.match(/\[UPDATE:(.*?)\]/);
        if (match) {
          const updates = {};
          match[1].split(',').forEach(pair => {
            const [k, v] = pair.split('=');
            if (v !== 'XX') updates[k] = parseFloat(v);
          });
          if (Object.keys(updates).length > 0) {
            await supabase.from('patients').update(updates).eq('id', patientId);
            await supabase.from('health_logs').insert([{ patient_id: patientId, ...updates }]);
            loadAllData();
          }
          aiResponseText = aiResponseText.replace(/\[UPDATE:.*?\]/, '').trim();
        }
      }

      const aiMsg = { role: 'assistant', message: aiResponseText };
      setMessages(prev => [...prev, aiMsg]);
      
      // Guardar el mensaje del usuario (el de la IA se guarda en la API)
      await supabase.from('chat_history').insert([{ patient_id: patientId, ...newUserMsg }]);
      
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- LÓGICA NUTRICIONAL (Mantenemos la misma) ---
  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const imcReal = (heightCm > 0) ? (weight / ((heightCm / 100) ** 2)).toFixed(1) : "0.0";
  const imcIdeal = 22.0;
  const recCalories = patientData ? Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500) : 2000; 
  const targets = {
    Desayuno: Math.round(recCalories * 0.20), Almuerzo: Math.round(recCalories * 0.10),
    Comida: Math.round(recCalories * 0.35), Merienda: Math.round(recCalories * 0.10),
    Cena: Math.round(recCalories * 0.20), Otros: Math.round(recCalories * 0.05)
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        <div style={{ minHeight: '350px', height: '350px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '15px', background: '#020617' }}>
          <BiometricVisualizer patientData={patientData || { weight: 70, stress_level: 5 }} />
        </div>

        {/* Widgets de IMC y Calorías */}
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
        </div>

        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />

        {/* Listado de Comidas */}
        <div style={{ marginTop: '10px' }}>
          {Object.keys(targets).map((cat) => {
            const catItems = foodLogs.filter(f => f.category === cat);
            const catTotal = catItems.reduce((acc, curr) => acc + curr.calories, 0);
            return (
              <details key={cat} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                <summary style={{ padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{cat}</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: catTotal > targets[cat] ? '#ef4444' : '#22c55e' }}>{catTotal} kcal</span>
                </summary>
                <div style={{ padding: '10px', background: '#f8fafc' }}>
                  {catItems.map((item, i) => (
                    <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>{item.description}</span>
                      <span>{item.calories}</span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
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

        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input 
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
          />
          <button type="submit" disabled={loading} style={{ background: '#22c55e', color: 'white', padding: '0 25px', borderRadius: '14px', border: 'none', cursor: 'pointer' }}>
            Enviar
          </button>
        </form>
      </main>
    </div>
  );
}