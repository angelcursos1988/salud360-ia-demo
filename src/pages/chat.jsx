import { useRouter } from 'next/router';
import ChatWindow from '../components/ChatWindow';

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) return <p>Cargando sesión...</p>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Aquí puedes poner tu Avatar a la izquierda si quieres */}
      <div style={{ flex: 1 }}>
        <ChatWindow patientId={id} />
      </div>
    </div>
  );
}