import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 1. IMPORTACIÓN DEL NUEVO COMPONENTE
import FoodTracker from './FoodTracker';

const BiometricVisualizer = dynamic(() => import('./BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '350px', background: '#020617', borderRadius: '20px' }} />
});

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [dailyCalories, setDailyCalories] = useState(0); 
  const [foodLogs, setFoodLogs] = useState([]); // Nuevo estado para el desglose
  const messagesEndRef = useRef(null);

  // Cargar datos iniciales
  const loadAllData = async () => {
    if (!patientId) return;
    
    // Datos del paciente
    const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
    if (pData) setPatientData(pData);

    // Historial de chat
    const { data: cData } = await supabase.from('chat_history').select('role, message').eq('patient_id', patientId).order('created_at', { ascending: true });
    if (cData && cData.length > 0) setMessages(cData);

    // Cargar registros de comida de hoy detallados
    const today = new Date().toISOString().split('T')[0];
    const { data: fData } = await supabase
      .from('food_logs')
      .select('*')
      .eq('patient_id', patientId)
      .gte('created_at', today);
    
    if (fData) {
      setFoodLogs(fData);
      const total = fData.reduce((acc, curr) => acc + curr.calories, 0) || 0;
      setDailyCalories(total);
    }
  };

  useEffect(() => {
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
      const patientContext = patientData ? `
        DATOS ACTUALES:
        - Nombre: ${patientData.name}
        - Peso: ${patientData.weight}kg
        - Objetivo: ${patientData.health_goal}
        - Calorías consumidas hoy: ${dailyCalories} kcal
      ` : "";

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: `Eres un asistente clínico. ${patientContext} 
          REGLAS: 1. No preguntes datos que ya tienes. 2. Si el usuario consumió muchas calorías, sugiere cenas ligeras en tablas.`
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }, { patient_id: patientId, role: 'assistant', message: data.message }]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      
      <aside style={{ width: '400px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        <div style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <BiometricVisualizer patientData={patientData} />
        </div>

        {/* REGISTRO DE COMIDAS */}
        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />

        {/* DESPLEGABLES POR CATEGORÍA */}
        <div style={{ marginTop: '10px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '16px', letterSpacing: '0.5px' }}>
            📊 DESGLOSE NUTRICIONAL HOY
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena', 'Otros'].map((cat) => {
              const catItems = foodLogs.filter(f => f.category === cat);
              const catTotal = catItems.reduce((acc, curr) => acc + curr.calories, 0);
              const icons = { Desayuno: '☕', Almuerzo: '🍏', Comida: '🍱', Merienda: '🥪', Cena: '🌙', Otros: '🍽️' };

              return (
                <details key={cat} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <summary style={{ listStyle: 'none', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{icons[cat]}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{cat}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: catTotal > 0 ? '#22c55e' : '#94a3b8' }}>
                      {catTotal} kcal
                    </span>
                  </summary>
                  <div style={{ padding: '0 16px 12px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                    {catItems.length > 0 ? catItems.map((item, idx) => (
                      <div key={idx} style={{ padding: '8px 0', fontSize: '12px', display: 'flex', justifyContent: 'space-between', borderBottom: idx !== catItems.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                        <span style={{ color: '#475569' }}>{item.description}</span>
                        <span style={{ fontWeight: '600' }}>{item.calories}</span>
                      </div>
                    )) : (
                      <div style={{ padding: '8px 0', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin registros</div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px' }}>
          <Link href="/dashboard" style={{ flex: 1 }}>
            <button style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', color: '#0f172a' }}>Panel Médico</button>
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>🔴 Finalizar Sesión</button>
          </Link>
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
              border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', fontSize: '14px'
            }}>
              <div className="markdown-container">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && <div style={{ color: '#94a3b8', fontSize: '12px' }}>IA analizando datos...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input 
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Pide un menú o consejo clínico..."
          />
          <button type="submit" disabled={loading} style={{ background: '#22c55e', color: 'white', padding: '0 25px', borderRadius: '14px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>Enviar</button>
        </form>
      </main>

      <style jsx global>{`
        .markdown-container table { border-collapse: collapse; width: 100%; margin: 15px 0; border: 1px solid #e2e8f0; }
        .markdown-container th, .markdown-container td { padding: 10px; border: 1px solid #e2e8f0; text-align: left; }
        .markdown-container th { background: #f8fafc; font-weight: 700; }
        summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}