import { useState, useEffect, useRef } from 'react';

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId,
          userMessage: userText
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error desconocido');

      setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
      
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        message: `Hubo un problema: ${error.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f7f6' }}>
      <div style={{ padding: '15px 25px', background: 'white', borderBottom: '2px solid #1abc9c', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/logo.jpg" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Asistente Salud360</h2>
          <span style={{ fontSize: '12px', color: '#27ae60', fontWeight: 'bold' }}>● En línea</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#95a5a6', marginTop: '20px' }}>
            <p>👋 Hola, cuéntame tus síntomas.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#1abc9c' : 'white',
            color: msg.role === 'user' ? 'white' : '#34495e',
            padding: '12px 16px',
            borderRadius: '12px',
            maxWidth: '75%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            {msg.message}
          </div>
        ))}
        {loading && <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Analizando...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ padding: '20px', background: 'white', display: 'flex', gap: '10px', borderTop: '1px solid #eee' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tus síntomas..."
          style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '25px', outline: 'none' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#1abc9c', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}