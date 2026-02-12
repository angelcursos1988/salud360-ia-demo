import { useRouter } from 'next/router';
import ChatWindow from '../components/ChatWindow';

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;

  // Mientras se carga el ID de la URL
  if (!id) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      fontFamily: 'sans-serif',
      background: '#f8fafc' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontWeight: 'bold' }}>Iniciando Enlace Clínico...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f8fafc', height: '100vh' }}>
      {/* Ahora ChatWindow es el dueño de la pantalla. 
          Él ya trae el visualizador 3D a la izquierda 
          y el chat a la derecha por sí solo.
      */}
      <ChatWindow patientId={id} />
    </div>
  );
}