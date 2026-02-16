import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, ContactShadows, Environment, Center, Html } from '@react-three/drei';
import * as THREE from 'three';

// 1. Componente del Modelo (Maneja la carga y el escalado)
function Model({ url, weight }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();

  // Lógica de escalado basada en el peso del paciente
  // Si el peso es 70kg, la escala es 1. Si es más, se ensancha.
  const scale = useMemo(() => {
    const factor = (Number(weight) || 70) / 70;
    // Limitamos el ensanchamiento para que no se deforme demasiado
    const widthFactor = Math.max(0.7, Math.min(factor, 1.5));
    return [widthFactor, 1, widthFactor];
  }, [weight]);

  // Rotación suave automática
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.005;
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={scale} 
      position={[0, 0, 0]} 
    />
  );
}

// 2. Componente de la Plataforma (Efecto Escáner Médico)
function ScannerFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <circleGeometry args={[2, 32]} />
      <meshStandardMaterial 
        color="#1e293b" 
        transparent 
        opacity={0.4} 
        roughness={0.1} 
        metalness={0.8} 
      />
    </mesh>
  );
}

// 3. Componente Principal (Visualizador)
export default function BiometricVisualizer({ patientData, isMini = false }) {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mientras se monta en el cliente o si no hay datos
  if (!isClient) return <div style={{ height: isMini ? '200px' : '450px', background: '#020617' }} />;

  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '200px' : '450px', 
      background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)', 
      borderRadius: '24px',
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      
      {error ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
          <p>⚠️ Error al cargar el modelo 3D<br/><small>Verifica que /public/avatar.glb existe</small></p>
        </div>
      ) : (
        <Canvas 
          shadows 
          // Ajustamos la cámara: z=8 para alejarla y y=1.5 para subir el punto de vista
          camera={{ position: [0, 1.5, 8], fov: 35 }}
          onError={(e) => setError(e)}
        >
          <ambientLight intensity={1} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
          
          <Suspense fallback={<Html center><span style={{color: '#60a5fa', fontWeight: 'bold'}}>INICIANDO ESCÁNER...</span></Html>}>
            <Environment preset="city" />
            
            <Center top>
              <Model url="/avatar.glb" weight={patientData?.weight} />
            </Center>

            <ScannerFloor />
            
            <ContactShadows 
              position={[0, 0, 0]} 
              opacity={0.6} 
              scale={10} 
              blur={2} 
              far={4} 
            />
          </Suspense>

          <OrbitControls 
            enableZoom={!isMini} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 1.6}
            target={[0, 1.2, 0]} // Enfoca la cámara a la altura del pecho
            makeDefault
          />
        </Canvas>
      )}

      {/* Overlay de datos rápido */}
      {patientData && !isMini && (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0,0,0,0.5)', padding: '10px 15px', borderRadius: '12px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>PACIENTE</span>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{patientData.name || 'Anónimo'}</span>
        </div>
      )}
    </div>
  );
}