import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Importación dinámica del visualizador
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

  // Cargar datos del paciente e historial de chat
  useEffect(() => {
    const loadAllData = async () => {
      if (!patientId) return;
      
      // 1. Traer datos biográficos y biométricos
      const { data: pData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (pData) setPatientData(pData);

      // 2. Traer historial de mensajes
      const { data: cData } = await supabase
        .from('chat_history')
        .select('role, message')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });
      
      if (cData && cData.length > 0) setMessages(cData);
    };
    
    loadAllData();
  }, [patientId]);

  // Auto-scroll al último mensaje
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
      // PREPARACIÓN DEL CONTEXTO: Inyectamos los datos de Supabase en el Prompt
      const patientContext = patientData ? `
        DATOS ACTUALES DEL PACIENTE:
        - Nombre: ${patientData.name}
        - Edad: ${patientData.age} años
        - Sexo: ${patientData.gender}
        - Peso: ${patientData.weight}kg
        - Altura: ${patientData.height}cm
        - Nivel de Actividad: ${patientData.activity_level || 'Moderado'}
        - Objetivo de Salud: ${patientData.health_goal}
        - Estrés: ${patientData.stress_level}/10
      ` : "";

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: `Eres un asistente clínico avanzado. 
          ${patientContext}
          
          REGLAS DE RESPUESTA:
          1. YA CONOCES los datos biométricos arriba indicados. NUNCA los preguntes.
          2. Si te piden menús o rutinas, genera SIEMPRE tablas de Markdown con columnas claras.
          3. Sé conciso y profesional. Máximo 2 párrafos de texto antes o después de una tabla.
          4. Si falta un dato (como nivel de actividad), asume 'Moderado' basándote en el perfil clínico.`
        })
      });

      const data = await response.json();
      const aiMessage = data.message;

      setMessages(prev => [...prev, { role: 'assistant', message: aiMessage }]);

      // Guardar en Supabase para persistencia
      await supabase.from('chat_history').insert([
        { patient_id: patientId, role: 'user', message: userText }, 
        { patient_id: patientId, role: 'assistant', message: aiMessage }
      ]);

    } catch (error) { 
      console.error("Error en el chat:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const AchievementCard = ({ label, value, color, icon, detail }) => (
    <div style={{ 
      background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '12px', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '10px', background: `${color}15`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' 
        }}>{icon}</div>
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
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* PANEL LATERAL: VISUALIZADOR Y LOGROS */}
      <aside style={{ 
        width: '400px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', 
        display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' 
      }}>
        <div style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <BiometricVisualizer patientData={patientData} />
        </div>

        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '16px' }}>ESTADO DE OBJETIVOS</h4>
          <AchievementCard label="Actividad" detail="Progreso semanal" value={patientData?.progress_activity || 0} color="#3b82f6" icon="🏃" />
          <AchievementCard label="Hidratación" detail="Consumo diario" value={patientData?.progress_hydration || 0} color="#0ea5e9" icon="💧" />
          <AchievementCard label="Calma" detail="Nivel de estrés" value={100 - (patientData?.progress_stress || 0)} color="#8b5cf6" icon="🧘" />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>📄 Exportar</button>
          <Link href="/dashboard" style={{ flex: 1 }}>
            <button style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Panel Médico</button>
          </Link>
        </div>
      </aside>

      {/* ÁREA DE CHAT */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#f1f5f9' : '#ffffff',
              padding: '16px 20px', borderRadius: '20px', marginBottom: '16px',
              maxWidth: '85%', marginLeft: msg.role === 'user' ? 'auto' : '0',
              border: msg.role === 'assistant' ? '1px solid #f1f5f9' : 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              fontSize: '14px'
            }}>
              <div className="markdown-container">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.message}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && <div style={{ color: '#94a3b8', fontSize: '12px' }}>IA analizando biométricas...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input 
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe aquí (ej: 'hazme un menú de 3 días')..."
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