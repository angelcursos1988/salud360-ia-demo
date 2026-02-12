import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const messagesEndRef = useRef(null);

  // --- LÓGICA DEL AVATAR DINÁMICO ---
  const getAvatarConfig = () => {
    const stress = patientData?.stress_level || 0;
    if (stress >= 8) {
      return {
        emoji: "😰",
        color: "#ff4d4d",
        label: "Estado Crítico",
        shadow: "0 0 15px rgba(255, 77, 77, 0.4)",
        pulse: true
      };
    } else if (stress >= 4) {
      return {
        emoji: "😐",
        color: "#ffa502",
        label: "Estado Alerta",
        shadow: "0 0 15px rgba(255, 165, 2, 0.3)",
        pulse: false
      };
    } else {
      return {
        emoji: "😊",
        color: "#27ae60",
        label: "Estado Óptimo",
        shadow: "0 0 15px rgba(39, 174, 96, 0.2)",
        pulse: false
      };
    }
  };

  const avatar = getAvatarConfig();

  // 1. CARGA DE DATOS E HISTORIAL
  useEffect(() => {
    const loadAllData = async () => {
      if (!patientId) return;
      
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      const { data: cData } = await supabase
        .from('chat_history')
        .select('role, message')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (cData && cData.length > 0) {
        setMessages(cData);
      } else {
        setMessages([{
          role: 'assistant',
          message: `Hola ${pData?.name || ''}. He analizado tu perfil (${pData?.diet_type}, actividad ${pData?.activity}). ¿Cómo te sientes con tus ${pData?.sleep_hours}h de sueño de anoche?`
        }]);
      }
    };
    loadAllData();
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. GUARDAR RETOS Y MENSAJES EN LA DB
  const saveToDB = async (role, text) => {
    await supabase.from('chat_history').insert([
      { patient_id: patientId, role, message: text }
    ]);
  };

  const saveChallenge = async (title) => {
    await supabase.from('challenges').insert([
      { patient_id: patientId, title, is_completed: false }
    ]);
  };

  // 3. ENVÍO DE MENSAJES
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userText }]);
    await saveToDB('user', userText);
    setLoading(true);

    try {
      const contextPrompt = `
        Eres Salud360, un Asistente Médico y Coach de Bienestar experto.
        CONTEXTO DEL PACIENTE:
        - Nombre: ${patientData?.name}
        - Perfil: ${patientData?.gender}, ${patientData?.age} años, Dieta ${patientData?.diet_type}.
        - Actividad: ${patientData?.activity}.
        - Datos de hoy: Peso ${patientData?.weight}kg, Estrés ${patientData?.stress_level}/10, Sueño ${patientData?.sleep_hours}h.

        TAREA:
        - Analiza si sus métricas son saludables.
        - Si el estrés es alto (>7), prioriza calma.
        - Si es sedentario, motiva cambios.
        - Usa: [RETO: Nombre corto] para asignar objetivos.
      `;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: contextPrompt 
        })
      });

      const data = await response.json();
      let aiMessage = data.message || "Lo siento, mi conexión se ha interrumpido.";

      const challengeMatch = aiMessage.match(/\[RETO:\s*(.*?)\]/);
      if (challengeMatch) {
        const challengeTitle = challengeMatch[1];
        await saveChallenge(challengeTitle);
        aiMessage = aiMessage.replace(challengeMatch[0], `\n\n🎯 **Nuevo Reto Asignado:** ${challengeTitle}`);
      }

      setMessages(prev => [...prev, { role: 'assistant', message: aiMessage }]);
      await saveToDB('assistant', aiMessage);

    } catch (error) {
      console.error("Error en la comunicación:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* CSS para la animación de pulso del Avatar */}
      <style>{`
        @keyframes avatar-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 77, 77, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 77, 77, 0); }
        }
        .pulse-effect { animation: avatar-pulse 2s infinite; }
      `}</style>

      {/* Header con Avatar Dinámico */}
      <div style={{ padding: '15px 25px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          background: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          border: `3px solid ${avatar.color}`,
          boxShadow: avatar.shadow,
          transition: 'all 0.5s ease'
        }} className={avatar.pulse ? 'pulse-effect' : ''}>
          {avatar.emoji}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Especialista Salud360</h3>
          <span style={{ fontSize: '12px', color: avatar.color, fontWeight: 'bold', textTransform: 'uppercase' }}>
            ● {avatar.label} | {patientData?.name}
          </span>
        </div>
      </div>

      {/* Área de mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#27ae60' : 'white',
            color: msg.role === 'user' ? 'white' : '#334155',
            padding: '12px 18px',
            borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
            maxWidth: '85%',
            fontSize: '15px',
            lineHeight: '1.5',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
            whiteSpace: 'pre-line'
          }}>
            {msg.message}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#64748b', fontSize: '13px', marginLeft: '5px' }}>
            <span className="pulse-effect" style={{ width: '8px', height: '8px', background: avatar.color, borderRadius: '50%' }}></span>
            Analizando tus biométricas...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de texto */}
      <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
        <input 
          style={{ flex: 1, padding: '14px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px', background: '#f8fafc' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe cómo te sientes..."
        />
        <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '0 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}