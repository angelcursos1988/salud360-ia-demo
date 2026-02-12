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

  // 1. CARGA DE DATOS DEL PACIENTE Y EL HISTORIAL
  useEffect(() => {
    const loadAllData = async () => {
      if (!patientId || !supabase) return;
      
      // Cargar ficha técnica del paciente
      const { data: pData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (pData) setPatientData(pData);

      // Cargar historial de chat persistente
      const { data: cData, error } = await supabase
        .from('chat_history')
        .select('role, message, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error al cargar historial:", error);
      } else if (cData && cData.length > 0) {
        setMessages(cData);
      } else {
        // Mensaje de bienvenida si el chat está vacío
        setMessages([{
          role: 'assistant',
          message: `Hola ${pData?.name || ''}. Soy tu Especialista en Nutrición Digital. He analizado tu perfil y tu objetivo de ${pData?.health_goal || 'bienestar'}. ¿En qué podemos enfocarnos hoy?`
        }]);
      }
    };

    loadAllData();
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. EXPORTAR PDF (DISEÑO PROFESIONAL)
  const exportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.setTextColor(39, 174, 96); // Verde Salud360
    doc.text("SALUD360 - REPORTE EVOLUTIVO", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Paciente: ${patientData?.name || 'ID: ' + patientId}`, 14, 30);
    doc.text(`Perfil: ${patientData?.age || '--'} años | ${patientData?.weight || '--'}kg | Dieta: ${patientData?.diet_type || '--'}`, 14, 35);
    doc.text(`Fecha del informe: ${dateStr}`, 14, 40);
    
    doc.setDrawColor(230);
    doc.line(14, 45, 196, 45);

    const tableRows = messages.map(msg => [
      new Date(msg.created_at || Date.now()).toLocaleDateString(),
      msg.role === 'user' ? 'Paciente' : 'Especialista IA',
      msg.message
    ]);

    doc.autoTable({
      startY: 50,
      head: [['Fecha', 'Origen', 'Intervención / Recomendación']],
      body: tableRows,
      headStyles: { fillColor: [39, 174, 96], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 30 } }
    });

    doc.save(`Reporte_Salud360_${patientData?.name || 'Paciente'}.pdf`);
  };

  // 3. ENVIAR MENSAJE CON CONTEXTO CLÍNICO
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const tempTimestamp = new Date().toISOString();
    
    setMessages(prev => [...prev, { role: 'user', message: userText, created_at: tempTimestamp }]);
    setLoading(true);

    try {
      // Prompt dinámico basado en los datos reales del check-in
      const contextPrompt = `
        PACIENTE: ${patientData?.name}. 
        DATOS CLÍNICOS: Edad ${patientData?.age}, Peso ${patientData?.weight}kg, Dieta ${patientData?.diet_type}.
        ALERGIAS: ${patientData?.allergies || 'Ninguna'}. 
        ESTADO HOY: Estrés ${patientData?.stress_level}/10, Sueño ${patientData?.sleep_hours}h, Digestión ${patientData?.digestion}.
        Responde brevemente siguiendo los retos de Salud360.
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
      if (!response.ok) throw new Error(data.error || 'Error en el servidor');

      setMessages(prev => [...prev, { role: 'assistant', message: data.message, created_at: new Date().toISOString() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', message: `Lo siento, hubo un error técnico: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER DE MARCA */}
      <div style={{ 
        padding: '16px 24px', background: 'white', borderBottom: '3px solid #27ae60', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '42px', height: '42px', background: '#27ae60', borderRadius: '10px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
          }}>S360</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
              {patientData ? `Plan de ${patientData.name}` : 'Cargando perfil...'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', background: '#27ae60', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Asistente Clínico Inteligente</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={exportPDF}
          style={{ 
            padding: '8px 16px', background: '#2c3e50', color: 'white', 
            border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
            fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          📄 Exportar Evolutivo
        </button>
      </div>

      {/* ÁREA DE MENSAJES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              background: msg.role === 'user' ? '#27ae60' : 'white',
              color: msg.role === 'user' ? 'white' : '#334155',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              fontSize: '15px',
              lineHeight: '1.4'
            }}>
              {msg.message}
            </div>
            <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '10px 15px', borderRadius: '12px', fontSize: '13px', color: '#64748b' }}>
            Analizando tus datos...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER / INPUT */}
      <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="¿Cómo te sientes hoy? Informa tu progreso..."
            style={{ 
              flex: 1, padding: '12px 20px', border: '1px solid #e2e8f0', 
              borderRadius: '25px', outline: 'none', fontSize: '15px',
              background: '#f8fafc', transition: 'all 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#27ae60'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '48px', height: '48px', background: '#27ae60', color: 'white', 
              border: 'none', borderRadius: '50%', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(39, 174, 96, 0.3)', transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '18px' }}>✈️</span>
          </button>
        </form>
      </div>
    </div>
  );
}