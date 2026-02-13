import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, ContactShadows, Environment, Html } from '@react-three/drei';

function HumanModel({ weight }) {
  // Usamos un modelo de prueba estable
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/man/model.gltf');
  
  const modelRef = useRef();
  
  // Lógica de escalado por peso
  const scaleX = (weight || 70) / 70;

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={[scaleX, 1, 1]} // Solo ensancha horizontalmente según peso
      position={[0, -1.5, 0]} 
    />
  );
}

// Componente para capturar errores de carga
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div style={{color: 'white', padding: 20}}>Error al cargar el modelo 3D.</div>;
    return this.props.children;
  }
}

export default function BiometricVisualizer({ patientData }) {
  // Verificación de seguridad
  if (!patientData) return null;

  return (
    <div style={{ width: '100%', height: '400px', background: '#020617', borderRadius: '20px' }}>
      <ErrorBoundary>
        <Canvas camera={{ position: [0, 0, 4] }}>
          <ambientLight intensity={0.5} />
          <Environment preset="city" />
          
          <Suspense fallback={<Html center><span style={{color: 'white'}}>Cargando Biometría...</span></Html>}>
            <HumanModel weight={patientData.weight} />
          </Suspense>

          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} />
          <OrbitControls enableZoom={false} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}