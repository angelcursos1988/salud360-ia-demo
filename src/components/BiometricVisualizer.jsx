import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect } from 'react';
import { Float, Stars, Trail, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Componente del Núcleo Central
function HealthCore({ petData }) {
  const coreRef = useRef();
  const outerRingRef = useRef();
  const innerRingRef = useRef();

  // 1. Lógica de Color (Elegante y Tecnológica)
  const coreColor = useMemo(() => {
    const health = petData?.health ?? 100;
    if (health < 40) return "#ef4444"; // Rojo Alerta
    if (health < 70) return "#f59e0b"; // Ámbar Precaución
    return "#06b6d4"; // Cyan Futuro (Saludable)
  }, [petData]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const energy = petData?.energy ?? 100;
    const speed = Math.max(0.2, energy / 50);

    // Rotaciones orbitales
    if (outerRingRef.current) {
        outerRingRef.current.rotation.x = t * speed * 0.2;
        outerRingRef.current.rotation.y = t * speed * 0.1;
    }
    if (innerRingRef.current) {
        innerRingRef.current.rotation.x = -t * speed * 0.4;
        innerRingRef.current.rotation.z = t * speed * 0.2;
    }

    // Latido del núcleo (Simula respiración/latido)
    if (coreRef.current) {
        const pulse = 1 + Math.sin(t * 2) * 0.05;
        coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group>
      {/* NÚCLEO CENTRAL (Esfera de energía sólida) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial 
            color={coreColor} 
            emissive={coreColor} 
            emissiveIntensity={2} 
            toneMapped={false} 
        />
      </mesh>

      {/* ANILLO INTERNO (Estructura Wireframe) */}
      <mesh ref={innerRingRef}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial 
            color="#ffffff" 
            wireframe 
            transparent 
            opacity={0.15} 
        />
      </mesh>

      {/* ANILLO EXTERNO (Datos flotantes) */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[1.6, 0.02, 16, 100]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} />
      </mesh>
      
      {/* PARTÍCULAS DE ENERGÍA */}
      <Sparkles count={50} scale={4} size={2} speed={0.4} opacity={0.5} color={coreColor} />
    </group>
  );
}

export default function BiometricVisualizer({ patientData, petData, isMini = false }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={{ height: isMini ? '150px' : '350px', background: '#020617' }} />;

  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '150px' : '350px', 
      background: '#020617', // Fondo negro puro para contraste
      borderRadius: isMini ? '12px' : '24px', 
      overflow: 'hidden', 
      position: 'relative',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)'
    }}>
      {/* UI SUPERPUESTA (HUD) */}
      {!isMini && (
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></div>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>SYSTEM ONLINE</div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '300', color: 'white', letterSpacing: '-1px' }}>
                {petData?.health ?? 100}% <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Integridad</span>
            </div>
        </div>
      )}

      {/* ESCENA 3D */}
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        {/* Efectos de Post-Procesado simulados con luces */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#4f46e5" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c026d3" />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <HealthCore petData={petData} />
        </Float>

        {/* Fondo de estrellas sutil */}
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  );
}