import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';

function HumanoidMesh({ stress, weight, isMini }) {
  const groupRef = useRef();

  const color = useMemo(() => {
    const s = Number(stress) || 0;
    const hue = ((10 - s) * 12) / 360;
    return new THREE.Color().setHSL(hue, 0.8, 0.5);
  }, [stress]);

  const bodyWidth = useMemo(() => {
    const w = Number(weight) || 70;
    return Math.max(0.8, Math.min(w / 70, 1.4));
  }, [weight]);

  useFrame((state) => {
    if (!groupRef.current || isMini) return;
    const time = state.clock.getElapsedTime();
    groupRef.current.rotation.y += 0.008;
    const pulse = Math.sin(time * (Number(stress) > 7 ? 6 : 1.5)) * 0.1;
    groupRef.current.position.y = -1.5 + pulse;
  });

  const materialProps = {
    color: color,
    wireframe: true,
    transparent: true,
    opacity: isMini ? 0.3 : 0.5,
    emissive: color,
    emissiveIntensity: (Number(stress) || 0) / 10
  };

  return (
    <group ref={groupRef} position={isMini ? [0, -1, 0] : [0, 0, 0]}>
      {/* Cabeza */}
      <mesh position={[0, 3.8, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Pecho */}
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.5 * bodyWidth, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Tronco */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.4 * bodyWidth, 0.35 * bodyWidth, 1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Brazos */}
      {[1, -1].map((side) => (
        <group key={side} position={[0.6 * side * bodyWidth, 3.1, 0]}>
          <mesh rotation={[0, 0, 0.1 * side]}>
            <capsuleGeometry args={[0.1, 1.2, 4, 8]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      ))}
      {/* Piernas */}
      {[1, -1].map((side) => (
        <group key={side} position={[0.25 * side * bodyWidth, 1.5, 0]}>
          <mesh>
            <capsuleGeometry args={[0.15, 1.8, 4, 8]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function BiometricVisualizer({ patientData, isMini = false }) {
  const [mounted, setMounted] = useState(false);

  // Forzamos el montaje solo en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!patientData || !mounted) return <div style={{height: '100%', background: '#020617'}} />;

  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '150px' : '350px', 
      background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)', 
      borderRadius: isMini ? '12px' : '20px', 
      overflow: 'hidden', 
      position: 'relative' 
    }}>
      {!isMini && (
        <div style={{ 
          position: 'absolute', top: '15px', left: '15px', zIndex: 10, 
          fontSize: '10px', fontWeight: '800', color: '#38bdf8', 
          textTransform: 'uppercase', letterSpacing: '1px' 
        }}>
          Biometric Scan v2.2
        </div>
      )}
      
      <Canvas 
        shadows 
        camera={{ position: [0, 2.5, isMini ? 10 : 8], fov: 45 }}
        style={{ pointerEvents: 'none' }} // Evita interferencias con el scroll
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        
        <HumanoidMesh 
          stress={patientData.stress_level} 
          weight={patientData.weight} 
          isMini={isMini} 
        />
      </Canvas>
    </div>
  );
}