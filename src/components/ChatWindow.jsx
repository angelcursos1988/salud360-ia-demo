import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const messagesEndRef = useRef(null);

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

  // 3. ENVÍO DE MENSAJES CON PROMPT AVANZADO
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userText }]);
    await saveToDB('user', userText); // Guardamos el mensaje del usuario
    setLoading(true);

    try {
      // ESTE ES EL CEREBRO: El System Prompt
      const contextPrompt = `
        Eres Salud360, un Asistente Médico y Coach de Bienestar experto.
        CONTEXTO DEL PACIENTE:
        - Nombre: ${patientData?.name}
        - Perfil: ${patientData?.gender}, ${patientData?.age} años, Dieta ${patientData?.diet_type}.
        - Actividad: ${patientData?.activity}.
        - Datos de hoy: Peso ${patientData?.weight}kg, Estrés ${patientData?.stress_level}/10, Sueño ${patientData?.sleep_hours}h.

        TAREA:
        - Analiza si sus métricas son saludables para su nivel de actividad.
        - Si el estrés es alto (>7), prioriza consejos de calma.
        - Si es sedentario, motiva pequeños cambios.
        - Sé empático pero profesional. Usa datos científicos.
        - Para asignar un reto usa: [RETO: Nombre corto del reto].
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

      // Detección de retos
      const challengeMatch = aiMessage.match(/\[RETO:\s*(.*?)\]/);
      if (challengeMatch) {
        const challengeTitle = challengeMatch[1];
        await saveChallenge(challengeTitle);
        aiMessage = aiMessage.replace(challengeMatch[0], `\n\n🎯 **Nuevo Reto Asignado:** ${challengeTitle}`);
      }

      setMessages(prev => [...prev, { role: 'assistant', message: aiMessage }]);
      await saveToDB('assistant', aiMessage); // Guardamos la respuesta de la IA

    } catch (error) {
      console.error("Error en la comunicación:", error);
    } finally {
      setLoading(false);
    }
  };

  // 4. DISEÑO VISUAL
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '15px 25px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ width: '45px', height: '45px', background: '#27ae60', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>S</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Especialista Salud360</h3>
          <span style={{ fontSize: '12px', color: '#27ae60', fontWeight: 'bold' }}>● En línea | Analizando perfil de {patientData?.name}</span>
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
            whiteSpace: 'pre-line' // Para que respete los saltos de línea
          }}>
            {msg.message}
          </div>
        ))}
        {loading && <div style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>Salud360 está procesando tus biométricas...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de texto */}
      <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
        <input 
          style={{ flex: 1, padding: '14px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px', background: '#f8fafc' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu duda o cómo te sientes..."
        />
        <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '0 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}