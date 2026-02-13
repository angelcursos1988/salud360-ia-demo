import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Stage, Html, Center } from '@react-three/drei';

function HumanModel({ weight }) {
  // Probamos con este modelo de "Hombre Base" que es muy compatible
  // Si este no carga, el problema es la conexión a internet/firewall
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/duck/model.gltf'); 
  // Nota: He puesto un patito temporalmente porque pesa poco, si sale el pato, 
  // solo tenemos que cambiar la URL por el humano.

  const factor = (weight || 70) / 70;

  return (
    <primitive 
      object={scene} 
      scale={[factor, 1, factor]} // Escalado de peso
    />
  );
}

export default function BiometricVisualizer({ patientData, isMini = false }) {
  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '200px' : '450px', 
      background: '#111827', // Un gris muy oscuro, mejor que negro puro para ver siluetas
      borderRadius: '24px',
      position: 'relative'
    }}>
      
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
        {/* Luz ambiental fuerte para que NADA se vea negro */}
        <ambientLight intensity={2} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        
        <Suspense fallback={<Html center><span style={{color: 'white'}}>Cargando Mascota...</span></Html>}>
          {/* Stage ajusta automáticamente las luces y el centrado del modelo */}
          <Stage environment="city" intensity={0.5} contactShadow={true} shadowBias={-0.0015}>
            <Center>
               <HumanModel weight={patientData?.weight} />
            </Center>
          </Stage>
        </Suspense>

        <OrbitControls makeDefault enableZoom={!isMini} />
      </Canvas>

      {/* Etiqueta de aviso si no hay datos */}
      {!patientData && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
          Esperando datos biométricos...
        </div>
      )}
    </div>
  );
}