import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. CARGA DE HISTORIAL REAL DESDE SUPABASE
  useEffect(() => {
    const loadHistory = async () => {
      if (!patientId || !supabase) return;
      
      const { data, error } = await supabase
        .from('chat_history')
        .select('role, message, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error al cargar historial:", error);
      } else if (data && data.length > 0) {
        setMessages(data);
      } else {
        // Mensaje de bienvenida inicial para perfiles nuevos
        setMessages([{
          role: 'assistant',
          message: "Hola. Soy tu Especialista en Nutrición Digital. Mi objetivo es acompañarte en la mejora de tu salud a través de un pre-diagnóstico clínico y retos progresivos. Para comenzar: ¿Cuál es tu objetivo principal de salud hoy y tienes alguna condición médica o alergia?"
        }]);
      }
    };

    loadHistory();
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. GENERADOR DE INFORME BASADO EN EL HISTORIAL PERSISTENTE
  const exportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    
    // Encabezado Estilizado
    doc.setFontSize(18);
    doc.setTextColor(39, 174, 96); // Verde Nutricional
    doc.text("INFORME EVOLUTIVO DE NUTRICIÓN", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Paciente ID: ${patientId}`, 14, 28);
    doc.text(`Fecha de Emisión: ${dateStr}`, 14, 33);
    doc.line(14, 36, 196, 36); // Línea divisoria

    // Cuerpo: Resumen de Retos y Conversación
    const tableRows = messages.map(msg => [
      new Date(msg.created_at || Date.now()).toLocaleDateString(),
      msg.role === 'user' ? 'Paciente' : 'Especialista',
      msg.message
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Fecha', 'Actor', 'Intervención / Progreso']],
      body: tableRows,
      headStyles: { fillColor: [39, 174, 96] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 30 } }
    });

    doc.save(`Informe_Nutricion_Salud360_${patientId}.pdf`);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    // Añadimos localmente con timestamp temporal para feedback inmediato
    setMessages(prev => [...prev, { role: 'user', message: userText, created_at: new Date().toISOString() }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, userMessage: userText })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en el servidor');

      setMessages(prev => [...prev, { role: 'assistant', message: data.message, created_at: new Date().toISOString() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', message: `Ocurrió un error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f7f6' }}>
      {/* Header con Botón de Informe */}
      <div style={{ 
        padding: '15px 25px', background: 'white', borderBottom: '2px solid #27ae60', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Mi Plan Nutricional</h2>
            <span style={{ fontSize: '11px', color: '#27ae60', fontWeight: 'bold' }}>● Seguimiento Continuo</span>
          </div>
        </div>
        
        <button 
          onClick={exportPDF}
          style={{ 
            padding: '8px 16px', background: '#2c3e50', color: 'white', 
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
            fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          📄 Exportar Evolutivo
        </button>
      </div>

      {/* Area de Chat */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#27ae60' : 'white',
            color: msg.role === 'user' ? 'white' : '#34495e',
            padding: '12px 16px',
            borderRadius: '12px',
            maxWidth: '75%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            fontSize: '15px'
          }}>
            {msg.message}
          </div>
        ))}
        {loading && <div style={{ fontSize: '12px', color: '#7f8c8d', paddingLeft: '10px' }}>Analizando progreso...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensaje */}
      <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', display: 'flex', gap: '10px', borderTop: '1px solid #eee' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Informa sobre tu reto o síntomas..."
          style={{ flex: 1, padding: '12px 20px', border: '1px solid #ddd', borderRadius: '25px', outline: 'none' }}
        />
        <button type="submit" style={{ padding: '10px 25px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}