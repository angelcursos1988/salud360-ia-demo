import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 1. IMPORTACIÓN DEL NUEVO COMPONENTE (Asegúrate de haber creado FoodTracker.jsx)
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
  const [dailyCalories, setDailyCalories] = useState(0); // Estado para el contador
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

    // Cargar calorías del día (hoy)
    const today = new Date().toISOString().split('T')[0];
    const { data: fData } = await supabase
      .from('food_logs')
      .select('calories')
      .eq('patient_id', patientId)
      .gte('created_at', today);
    
    const total = fData?.reduce((acc, curr) => acc + curr.calories, 0) || 0;
    setDailyCalories(total);
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

  const AchievementCard = ({ label, value, color, icon, detail }) => (
    <div style={{ background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: '700' }}>{label}</div>
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
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      
      <aside style={{ width: '400px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        <div style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <BiometricVisualizer patientData={patientData} />
        </div>

        {/* 2. REGISTRO DE COMIDAS (Punto 1 implementado) */}
        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />

        <div style={{ marginTop: '10px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '16px' }}>ESTADO DE OBJETIVOS</h4>
          {/* Mostramos el contador de calorías como un logro */}
          <AchievementCard 
            label="Calorías Hoy" 
            detail={`${dailyCalories} kcal registradas`} 
            value={Math.min((dailyCalories / 2000) * 100, 100)} 
            color="#f59e0b" 
            icon="🍽️" 
          />
          <AchievementCard label="Actividad" value={patientData?.progress_activity || 0} color="#3b82f6" icon="🏃" detail="Progreso semanal" />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>📄 Exportar</button>
            <Link href="/dashboard" style={{ flex: 1 }}>
              <button style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', color: '#0f172a' }}>Panel Médico</button>
            </Link>
          </div>
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
      `}</style>
    </div>
  );
}