import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ChatWindow from '../components/ChatWindow';

export default function ChatPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState(null);

  // Sincronizamos el ID de la URL con el estado local para mayor estabilidad
  useEffect(() => {
    if (router.isReady) {
      const { id } = router.query;
      if (id) setPatientId(id);
    }
  }, [router.isReady, router.query]);

  // Pantalla de carga mientras detectamos el ID
  if (!patientId) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#f8fafc' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          border: '4px solid #e2e8f0', 
          borderTop: '4px solid #3498db', 
          borderRadius: '50%', 
          width: '30px', 
          height: '30px', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 15px'
        }} />
        <p style={{ color: '#64748b', fontWeight: 'bold' }}>Iniciando Enlace Clínico...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* BARRA SUPERIOR DE NAVEGACIÓN */}
      <header style={{ 
        padding: '12px 24px', 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex', 
        alignItems: 'center',
        zIndex: 10
      }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
          onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
        >
          ⬅️ Volver al Panel Médico
        </button>
        
        <div style={{ marginLeft: '20px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
          Consulta Digital | Paciente ID: {patientId.slice(0, 8)}
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL DEL CHAT Y VISUALIZADOR */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ChatWindow patientId={patientId} />
      </main>

    </div>
  );
}