import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const messagesEndRef = useRef(null);

  // --- CONFIGURACIÓN CLÍNICA DEL AVATAR ---
  const getAvatarConfig = () => {
    const stress = patientData?.stress_level || 0;
    if (stress >= 8) {
      return {
        icon: "⚠️",
        color: "#dc2626",
        label: "ALERTA: ESTRÉS ELEVADO",
        shadow: "0 0 15px rgba(220, 38, 38, 0.3)",
        pulse: true
      };
    } else if (stress >= 4) {
      return {
        icon: "📊",
        color: "#ea580c",
        label: "SEGUIMIENTO PREVENTIVO",
        shadow: "0 0 15px rgba(234, 88, 12, 0.2)",
        pulse: false
      };
    } else {
      return {
        icon: "✅",
        color: "#16a34a",
        label: "PARÁMETROS EN RANGO",
        shadow: "0 0 15px rgba(22, 163, 74, 0.1)",
        pulse: false
      };
    }
  };

  const avatar = getAvatarConfig();

  // 1. CARGA DE DATOS E HISTORIAL
  useEffect(() => {
    const loadAllData = async () => {
      if (!patientId) return;
      
      // Datos del paciente
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      // Historial de chat real desde la DB
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
          message: `Protocolo de seguimiento iniciado para el paciente ${pData?.name || ''}. Se han analizado los biométricos actuales: Dieta ${pData?.diet_type}, Actividad ${pData?.activity}. Reporta ${pData?.sleep_hours}h de descanso. ¿Presenta alguna sintomatología o consulta sobre su plan terapéutico?`
        }]);
      }
    };
    loadAllData();
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. PERSISTENCIA DE DATOS
  const saveToDB = async (role, text) => {
    await supabase.from('chat_history').insert([{ patient_id: patientId, role, message: text }]);
  };

  const saveChallenge = async (title) => {
    // Nota: Esto asume que la tabla 'challenges' existe en tu Supabase
    await supabase.from('challenges').insert([{ patient_id: patientId, title, is_completed: false }]);
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
        Eres el Soporte Clínico Salud360, un sistema de IA experto en medicina preventiva y salud integral.
        CONTEXTO DEL PACIENTE:
        - Nombre: ${patientData?.name}
        - Perfil: ${patientData?.gender}, ${patientData?.age} años, Dieta ${patientData?.diet_type}.
        - Datos actuales: Peso ${patientData?.weight}kg, Estrés ${patientData?.stress_level}/10, Sueño ${patientData?.sleep_hours}h.

        DIRECTRICES DE RESPUESTA:
        - Tono: Profesional, clínico y basado en datos. Evita diminutivos o lenguaje excesivamente informal.
        - Si el estrés es > 7, prioriza técnicas de regulación emocional y descanso.
        - Para asignar un objetivo terapéutico usa estrictamente el formato: [RETO: Nombre corto del objetivo].
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
      let aiMessage = data.message || "Se ha producido una interrupción en el enlace con el servidor clínico.";

      // Detección de Objetivos Terapéuticos (Retos)
      const challengeMatch = aiMessage.match(/\[RETO:\s*(.*?)\]/);
      if (challengeMatch) {
        const challengeTitle = challengeMatch[1];
        await saveChallenge(challengeTitle);
        aiMessage = aiMessage.replace(challengeMatch[0], `\n\n🎯 **Objetivo Terapéutico Asignado:** ${challengeTitle}`);
      }

      setMessages(prev => [...prev, { role: 'assistant', message: aiMessage }]);
      await saveToDB('assistant', aiMessage);

    } catch (error) {
      console.error("Error clínico de comunicación:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes clinical-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        .pulse-red { animation: clinical-pulse 2s infinite; }
      `}</style>

      {/* Header Profesional con Avatar Dinámico */}
      <div style={{ padding: '15px 25px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          width: '45px',
          height: '45px',
          background: '#f1f5f9',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          border: `2px solid ${avatar.color}`,
          boxShadow: avatar.shadow,
          transition: 'all 0.5s ease'
        }} className={avatar.pulse ? 'pulse-red' : ''}>
          {avatar.icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Soporte Clínico Salud360</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: avatar.color, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ● {avatar.label}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>| Paciente: {patientData?.name}</span>
          </div>
        </div>
      </div>

      {/* Área de Mensajería */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#0f172a' : 'white',
            color: msg.role === 'user' ? 'white' : '#334155',
            padding: '12px 18px',
            borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
            maxWidth: '85%',
            fontSize: '14px',
            lineHeight: '1.6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
            whiteSpace: 'pre-line'
          }}>
            {msg.message}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px', fontStyle: 'italic', marginLeft: '5px' }}>
             <span style={{ width: '6px', height: '6px', background: avatar.color, borderRadius: '50%' }}></span>
             Analizando telemetría y biométricos...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Entrada de Datos */}
      <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
        <input 
          style={{ flex: 1, padding: '12px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', background: '#f8fafc' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describa su consulta o estado actual..."
        />
        <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0 25px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}