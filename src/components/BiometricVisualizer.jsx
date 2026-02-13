import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, ContactShadows, Environment, Html } from '@react-three/drei';

// Componente que carga el archivo 3D
function HumanModel({ weight, health }) {
  // Aquí pones la ruta a tu archivo .glb
  // Puedes descargar uno y ponerlo en /public/human.glb
  const { scene } = useGLTF('https://models.readyplayer.me/64b51e7314035c1d2483842c.glb');
  const modelRef = useRef();

  // Lógica de deformación por peso (Escalado en el eje X y Z)
  const bodyScale = useMemo(() => {
    const factor = (weight || 70) / 70;
    return [factor, 1, factor]; // Ensanchamos solo el ancho y profundidad
  }, [weight]);

  useFrame((state) => {
    if (modelRef.current) {
      // Rotación suave para que se vea desde todos los ángulos
      modelRef.current.rotation.y += 0.005;
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={1.8} 
      position={[0, -1.5, 0]} 
    >
      {/* Aplicamos el escalado de peso a los huesos del torso si es posible, 
          o a la escena completa para simplificar */}
      <mesh scale={bodyScale} /> 
    </primitive>
  );
}

// Pantalla de carga profesional
function Loader() {
  return (
    <Html center>
      <div style={{ color: '#64748b', fontFamily: 'monospace', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>CALIBRANDO BIOMETRÍA...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid rgba(0,0,0,0.1);
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    </Html>
  );
}

export default function BiometricVisualizer({ patientData, isMini = false }) {
  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '200px' : '450px', 
      background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f1f5f9 100%)',
      borderRadius: '24px',
      position: 'relative',
      border: '1px solid #e2e8f0'
    }}>
      
      {!isMini && (
        <div style={{ position: 'absolute', top: 25, left: 25, zIndex: 1 }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px' }}>MODELO ANATÓMICO V3</span>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Análisis en Tiempo Real</h2>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 4], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Suspense fallback={<Loader />}>
          <HumanModel weight={patientData?.weight} />
          <Environment preset="city" />
        </Suspense>

        <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={8} blur={3} far={10} />
        <OrbitControls enableZoom={false} minPolarAngle={Math.PI/4} maxPolarAngle={Math.PI/1.5} />
      </Canvas>
    </div>
  );
}