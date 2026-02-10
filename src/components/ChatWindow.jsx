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
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          userMessage: userMsg
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '20px', background: '#1abc9c', color: 'white' }}>
        <h1>💬 Pre-diagnóstico Médico</h1>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999' }}>
            <p>Hola! Cuéntame sobre tus síntomas.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#3498db' : '#ecf0f1',
            color: msg.role === 'user' ? 'white' : 'black',
            padding: '12px 16px',
            borderRadius: '8px',
            maxWidth: '70%',
            wordWrap: 'break-word'
          }}>
            {msg.message}
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: 'center', color: '#999' }}>
            <p>⏳ Analizando...</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{
        padding: '20px',
        background: '#f8f9fa',
        display: 'flex',
        gap: '10px',
        borderTop: '1px solid #ddd'
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#1abc9c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
}