// src/components/VisualizerCanvas.jsx
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import { Suspense } from 'react';

function Model({ weight }) {
  // Modelo de un humanoide base (estilo dummy/michelin)
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/michelin/model.gltf');
  const factor = (weight || 70) / 70;
  return <primitive object={scene} scale={[factor, 1, factor]} position={[0, -1, 0]} />;
}

export default function VisualizerCanvas({ patientData }) {
  return (
    <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
      <ambientLight intensity={1.5} />
      <Suspense fallback={null}>
        <Center>
          <Model weight={patientData?.weight} />
        </Center>
        <Environment preset="city" />
      </Suspense>
      <ContactShadows position={[0, -1, 0]} opacity={0.5} scale={10} blur={2.5} />
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}