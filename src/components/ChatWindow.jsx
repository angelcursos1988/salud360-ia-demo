import { useState, useEffect, useRef } from 'react';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    
    // 1. Añadir el mensaje del usuario a la interfaz
    // Nota: Usamos 'role' y 'message' para ser consistentes con tu renderizado
    setMessages(prev => [...prev, { role: 'user', message: userText }]);
    setLoading(true);

    try {
      // 2. Llamada a nuestra API personalizada
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId, // Enviamos el ID para guardar en DB
          userMessage: userText // Enviamos el mensaje
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en la respuesta');

      // 3. Añadir respuesta de la IA (que ya viene corta desde la API)
      setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
      
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        message: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías repetir?' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f7f6' }}>
      
      {/* CABECERA CON LOGO */}
      <div style={{ 
        padding: '15px 25px', 
        background: 'white', 
        borderBottom: '2px solid #1abc9c',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
      }}>
        <img 
          src="/logo.jpg" 
          alt="Logo Salud360" 
          style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Asistente Salud360</h2>
          <span style={{ fontSize: '12px', color: '#27ae60', fontWeight: 'bold' }}>● En línea</span>
        </div>
      </div>

      {/* CONTENEDOR DE MENSAJES */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '20px' }}>
            <p>👋 Hola, soy tu asistente médico virtual.</p>
            <p style={{ fontSize: '13px' }}>Cuéntame, ¿cómo te sientes hoy?</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#1abc9c' : 'white',
            color: msg.role === 'user' ? 'white' : '#34495e',
            padding: '12px 16px',
            borderRadius: msg.role === 'user' ? '15px 15px 2px 15px' : '15px 15px 15px 2px',
            maxWidth: '75%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            fontSize: '15px',
            lineHeight: '1.4'
          }}>
            {msg.message}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', background: '#eee', padding: '10px 15px', borderRadius: '15px' }}>
            <span style={{ color: '#7f8c8d', fontSize: '12px' }}>Analizando síntomas...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* FORMULARIO DE ENTRADA */}
      <form onSubmit={handleSendMessage} style={{
        padding: '20px',
        background: 'white',
        display: 'flex',
        gap: '10px',
        borderTop: '1px solid #eee'
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tus síntomas aquí..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 15px',
            border: '1px solid #ddd',
            borderRadius: '25px',
            fontSize: '15px',
            outline: 'none',
            background: loading ? '#f9f9f9' : 'white'
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            width: '45px',
            height: '45px',
            background: (loading || !input.trim()) ? '#bdc3c7' : '#1abc9c',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? '...' : '✈️'}
        </button>
      </form>
    </div>
  );
}