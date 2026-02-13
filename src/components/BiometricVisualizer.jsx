import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, ContactShadows, Environment, Html, Center } from '@react-three/drei';

// Modelo contenido en un componente separado para evitar errores de hidratación
function ModelContent({ weight }) {
  // Usamos una URL de un modelo humano extremadamente ligero y compatible
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/michelin/model.gltf', true);
  
  const factor = (weight || 70) / 70;

  return (
    <primitive 
      object={scene} 
      scale={[factor, 1, factor]} 
      position={[0, -1, 0]} 
    />
  );
}

export default function BiometricVisualizer({ patientData, isMini = false }) {
  const [isClient, setIsClient] = useState(false);

  // Evitamos que Next.js intente cargar el 3D en el servidor
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div style={{ height: isMini ? '200px' : '450px', background: '#111827' }} />;

  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '200px' : '450px', 
      background: 'radial-gradient(circle at 50% 50%, #1f2937 0%, #030712 100%)',
      borderRadius: '24px',
      overflow: 'hidden'
    }}>
      <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Suspense fallback={<Html center><span style={{color: 'white', fontSize: '12px'}}>CARGANDO AVATAR...</span></Html>}>
          <Center>
            <ModelContent weight={patientData?.weight} />
          </Center>
          <Environment preset="city" />
        </Suspense>

        <ContactShadows position={[0, -1, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
        <OrbitControls enableZoom={!isMini} minPolarAngle={Math.PI/4} maxPolarAngle={Math.PI/1.6} />
      </Canvas>
    </div>
  );
}