import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null); // NUEVO: Para guardar los datos de salud
  const messagesEndRef = useRef(null);

  // 1. CARGA DE DATOS DEL PACIENTE Y EL HISTORIAL
  useEffect(() => {
    const loadAllData = async () => {
      if (!patientId || !supabase) return;
      
      // Cargar datos de salud del paciente
      const { data: pData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (pData) setPatientData(pData);

      // Cargar historial de chat
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
        setMessages([{
          role: 'assistant',
          message: `Hola ${pData?.name || ''}. Soy tu Especialista en Nutrición Digital. He revisado tu perfil (Objetivo: ${pData?.health_goal || 'Bienestar'}). ¿En qué puedo ayudarte hoy con tu alimentación o progreso?`
        }]);
      }
    };

    loadAllData();
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. EXPORTAR PDF (MEJORADO CON DATOS REALES)
  const exportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.setTextColor(39, 174, 96);
    doc.text("INFORME EVOLUTIVO DE NUTRICIÓN", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Paciente: ${patientData?.name || patientId}`, 14, 28);
    doc.text(`Edad: ${patientData?.age || '--'} | Peso: ${patientData?.weight || '--'}kg | Dieta: ${patientData?.diet_type || '--'}`, 14, 33);
    doc.text(`Fecha: ${dateStr}`, 14, 38);
    doc.line(14, 40, 196, 40);

    const tableRows = messages.map(msg => [
      new Date(msg.created_at || Date.now()).toLocaleDateString(),
      msg.role === 'user' ? 'Paciente' : 'Especialista',
      msg.message
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Fecha', 'Actor', 'Intervención / Progreso']],
      body: tableRows,
      headStyles: { fillColor: [39, 174, 96] },
      styles: { fontSize: 8 }
    });

    doc.save(`Informe_Salud360_${patientData?.name || 'paciente'}.pdf`);
  };

  // 3. ENVIAR MENSAJE CON CONTEXTO MÉDICO
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userText, created_at: new Date().toISOString() }]);
    setLoading(true);

    try {
      // CONSTRUIMOS EL "SOPLO" PARA LA IA
      const contextPrompt = `
        CONTEXTO MÉDICO DEL PACIENTE:
        - Nombre: ${patientData?.name}
        - Edad: ${patientData?.age} años, Peso: ${patientData?.weight}kg, Altura: ${patientData?.height}cm.
        - Dieta: ${patientData?.diet_type}. Alergias: ${patientData?.allergies}.
        - Condiciones: ${patientData?.medical_conditions}. Objetivo: ${patientData?.health_goal}.
        - Hoy: Sueño ${patientData?.sleep_hours}h, Estrés ${patientData?.stress_level}/10, Digestión: ${patientData?.digestion}.
        Responde brevemente y ten en cuenta estos datos para tus consejos.
      `;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          userMessage: userText,
          systemPrompt: contextPrompt // Enviamos el contexto a la API
        })
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

  // El resto del return se mantiene igual...
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f7f6' }}>
      <div style={{ 
        padding: '15px 25px', background: 'white', borderBottom: '2px solid #27ae60', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Mi Plan: {patientData?.name || 'Cargando...'}</h2>
            <span style={{ fontSize: '11px', color: '#27ae60', fontWeight: 'bold' }}>● Seguimiento 360 Activo</span>
          </div>
        </div>
        <button onClick={exportPDF} style={{ padding: '8px 16px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
          📄 Exportar Evolutivo
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#27ae60' : 'white',
            color: msg.role === 'user' ? 'white' : '#34495e',
            padding: '12px 16px', borderRadius: '12px', maxWidth: '75%', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '15px'
          }}>
            {msg.message}
          </div>
        ))}
        {loading && <div style={{ fontSize: '12px', color: '#7f8c8d', paddingLeft: '10px' }}>Consultando tu perfil de salud...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', display: 'flex', gap: '10px', borderTop: '1px solid #eee' }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="¿Cómo te sientes hoy?"
          style={{ flex: 1, padding: '12px 20px', border: '1px solid #ddd', borderRadius: '25px', outline: 'none' }}
        />
        <button type="submit" style={{ padding: '10px 25px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}