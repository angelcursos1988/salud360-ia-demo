import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FoodTracker from './FoodTracker';

// Importación dinámica optimizada
const BiometricVisualizer = dynamic(() => import('./BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '350px', background: '#020617', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '12px' }}>Iniciando escaneo...</div>
});

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [dailyCalories, setDailyCalories] = useState(0); 
  const [foodLogs, setFoodLogs] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const loadAllData = async () => {
    if (!patientId) return;
    try {
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      const { data: cData } = await supabase.from('chat_history').select('role, message').eq('patient_id', patientId).order('created_at', { ascending: true });
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

  useEffect(() => { loadAllData(); }, [patientId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- LÓGICA NUTRICIONAL PROTEGIDA ---
  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const heightM = heightCm / 100;
  const imcReal = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : "0.0";
  const imcIdeal = 22.0;
  
  const recCalories = patientData 
    ? Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500) 
    : 2000; 

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
    setMessages(prev => [...prev, { role: 'user', message: userText }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: `Eres un asistente clínico. Paciente: ${patientData?.name}. IMC: ${imcReal}. Calorías hoy: ${dailyCalories}/${recCalories}.`
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }, { patient_id: patientId, role: 'assistant', message: data.message }]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // Eliminamos el return prematuro para que el layout se mantenga estable
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        
        {/* VISUALIZADOR 3D - Contenedor con altura reservada */}
        <div style={{ height: '350px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '15px', background: '#020617' }}>
          {!isInitialLoading && patientData ? (
            <BiometricVisualizer patientData={patientData} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '12px' }}>
              Cargando biometría...
            </div>
          )}
        </div>

        {/* WIDGET BIOMÉTRICO */}
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

        {/* DESPLEGABLES DE COMIDA */}
        <div style={{ marginTop: '10px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '12px', letterSpacing: '0.5px' }}>DESGLOSE VS OBJETIVO</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena', 'Otros'].map((cat) => {
              const catItems = foodLogs.filter(f => f.category === cat);
              const catTotal = catItems.reduce((acc, curr) => acc + curr.calories, 0);
              const target = targets[cat];

              return (
                <details key={cat} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <summary style={{ listStyle: 'none', padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{cat}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Objetivo: {target} kcal</span>
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

        {/* BARRA TOTAL INFERIOR */}
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

      <style jsx global>{`
        summary::-webkit-details-marker { display: none; }
        .markdown-container table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        .markdown-container th, td { padding: 10px; border: 1px solid #e2e8f0; }
      `}</style>
    </div>
  );
}