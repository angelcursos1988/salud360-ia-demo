import { useRouter } from 'next/router';
import ChatWindow from '../components/ChatWindow';
import Avatar from '../components/Avatar'; 
import Link from 'next/link';

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;

  // Mientras se carga el ID de la URL
  if (!id) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <p>Cargando sesión de salud...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f4f7f6', fontFamily: 'sans-serif' }}>
      
      {/* COLUMNA IZQUIERDA: EL AVATAR */}
      <div style={{ 
        flex: 1, 
        borderRight: '1px solid #ddd', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'white',
        padding: '20px' 
      }}>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <Avatar patientId={id} />
        </div>
        <h3 style={{ color: '#2c3e50', margin: '10px 0' }}>Tu Estado Actual</h3>
        <p style={{ color: '#7f8c8d', fontSize: '14px', textAlign: 'center' }}>
          El avatar reacciona según cómo te sientas y lo que converses con la IA.
        </p>
        
        <Link href="/">
          <button style={{ marginTop: '30px', padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', background: 'none', cursor: 'pointer' }}>
            Terminar Consulta
          </button>
        </Link>
      </div>

      {/* COLUMNA DERECHA: EL CHAT */}
      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
        <ChatWindow patientId={id} />
      </div>
    </div>
  );
}