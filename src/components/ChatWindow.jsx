import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadAllData = async () => {
      if (!patientId) return;
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (pData) setPatientData(pData);

      const { data: cData } = await supabase
        .from('chat_history')
        .select('role, message, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (cData && cData.length > 0) setMessages(cData);
      else {
        setMessages([{
          role: 'assistant',
          message: `Hola ${pData?.name || ''}. He analizado tus datos (Peso: ${pData?.weight}kg, Estrés: ${pData?.stress_level}/10). ¿En qué reto vamos a trabajar hoy?`
        }]);
      }
    };
    loadAllData();
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // FUNCIÓN PARA GUARDAR EL RETO EN SUPABASE
  const saveChallenge = async (challengeTitle) => {
    try {
      await supabase.from('challenges').insert([{
        patient_id: patientId,
        title: challengeTitle,
        is_completed: false,
        created_at: new Date().toISOString()
      }]);
      console.log("Reto guardado:", challengeTitle);
    } catch (error) {
      console.error("Error al guardar reto:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userText }]);
    setLoading(true);

    try {
      const contextPrompt = `
        PACIENTE: ${patientData?.name}. PESO: ${patientData?.weight}kg. ESTRÉS: ${patientData?.stress_level}/10. SUEÑO: ${patientData?.sleep_hours}h.
        REGLA: Si detectas una necesidad, asigna un reto usando exactamente este formato: [RETO: Nombre del Reto]. Solo uno por vez.
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
      let aiMessage = data.message;

      // DETECTAR RETO CON REGEX
      const challengeMatch = aiMessage.match(/\[RETO:\s*(.*?)\]/);
      if (challengeMatch) {
        const challengeTitle = challengeMatch[1];
        await saveChallenge(challengeTitle);
        // Opcional: Limpiar el tag de la respuesta para que no se vea feo
        aiMessage = aiMessage.replace(challengeMatch[0], `🎯 **Nuevo Reto:** ${challengeTitle}`);
      }

      setMessages(prev => [...prev, { role: 'assistant', message: aiMessage }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Renderizado del chat (estética Opción C)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '3px solid #27ae60', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: '#27ae60', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>S360</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px' }}>{patientData?.name || 'Cargando...'}</h2>
            <span style={{ fontSize: '12px', color: '#27ae60' }}>● Especialista Activo</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#27ae60' : 'white',
            color: msg.role === 'user' ? 'white' : '#1e293b',
            padding: '12px 16px',
            borderRadius: '15px',
            maxWidth: '80%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
          }}>
            {msg.message}
          </div>
        ))}
        {loading && <div style={{ color: '#94a3b8', fontSize: '12px' }}>IA analizando biométrica...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', display: 'flex', gap: '10px' }}>
        <input 
          style={{ flex: 1, padding: '12px 20px', borderRadius: '25px', border: '1px solid #e2e8f0', outline: 'none' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Habla con tu especialista..."
        />
        <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '0 20px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>Enviar</button>
      </form>
    </div>
  );
}