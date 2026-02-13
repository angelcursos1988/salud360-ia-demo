import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { useGLTF, OrbitControls, ContactShadows, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';

// 1. Separamos el modelo para que el Suspense funcione correctamente
function Model({ weight }) {
  // Modelo humanoide profesional y ligero
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/michelin/model.gltf');
  
  const modelRef = useRef();

  // Tu lógica de peso aplicada al modelo real
  const bodyWidth = useMemo(() => {
    const w = Number(weight) || 70;
    return Math.max(0.8, Math.min(w / 70, 1.4));
  }, [weight]);

  useFrame((state) => {
    if (!modelRef.current) return;
    // Rotación suave como tenías antes
    modelRef.current.rotation.y += 0.005;
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={[bodyWidth, 1, bodyWidth]} // Se ensancha según tu lógica de peso
      position={[0, -1, 0]} 
    />
  );
}

export default function BiometricVisualizer({ patientData, isMini = false }) {
  const [mounted, setMounted] = useState(false);

  // Mantenemos tu useEffect original que evitaba el error de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!patientData || !mounted) return <div style={{height: isMini ? '150px' : '350px', background: '#020617'}} />;

  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '150px' : '350px', 
      background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)', 
      borderRadius: isMini ? '12px' : '20px', 
      overflow: 'hidden', 
      position: 'relative' 
    }}>
      
      <Canvas 
        shadows 
        camera={{ position: [0, 2, 6], fov: 35 }}
      >
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* El Suspense es OBLIGATORIO cuando usas useGLTF para que no explote al cargar */}
        <Suspense fallback={null}>
          <Center top>
            <Model weight={patientData.weight} />
          </Center>
          <Environment preset="city" />
        </Suspense>

        <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={10} blur={2.5} />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}