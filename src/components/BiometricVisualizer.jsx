import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function HumanoidMesh({ stress, age, weight }) {
  const groupRef = useRef();

  // Color dinámico: Verde (Sano) -> Naranja (Cuidado) -> Rojo (Estrés)
  const color = useMemo(() => {
    const s = Number(stress) || 0;
    const hue = ((10 - s) * 12) / 360;
    return new THREE.Color().setHSL(hue, 0.8, 0.5);
  }, [stress]);

  // Escala corporal basada en peso (70kg como base)
  const bodyWidth = useMemo(() => {
    const w = Number(weight) || 70;
    return Math.max(0.8, Math.min(w / 70, 1.4));
  }, [weight]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Rotación constante 360º
    groupRef.current.rotation.y += 0.008;

    // Efecto de flotación/respiración
    const pulse = Math.sin(time * (Number(stress) > 7 ? 6 : 1.5)) * 0.1;
    groupRef.current.position.y = -1.5 + pulse;
  });

  const materialProps = {
    color: color,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
    emissive: color,
    emissiveIntensity: (Number(stress) || 0) / 10
  };

  return (
    <group ref={groupRef}>
      {/* CABEZA - Proporción más realista */}
      <mesh position={[0, 3.8, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* CUELLO */}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.2, 8]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* TORSO SUPERIOR (Pecho/Hombros) */}
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.5 * bodyWidth, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* TORSO INFERIOR (Abdomen) */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.4 * bodyWidth, 0.35 * bodyWidth, 1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* BRAZOS (Simétricos) */}
      {[1, -1].map((side) => (
        <group key={side} position={[0.6 * side * bodyWidth, 3.1, 0]}>
          <mesh rotation={[0, 0, 0.1 * side]}>
            <capsuleGeometry args={[0.1, 1.2, 4, 8]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      ))}

      {/* PIERNAS (Simétricos) */}
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

export default function BiometricVisualizer({ patientData }) {
  if (!patientData) return null;

  return (
    <div style={{ 
      width: '100%', 
      height: '350px', 
      background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)', 
      borderRadius: '20px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)'
    }}>
      <div style={{
        position: 'absolute', top: '15px', left: '15px', zIndex: 1,
        fontSize: '10px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        Biometric Scan v2.2 • ACTIVE
      </div>
      
      {/* fov: 45 y position [0, 1, 8] asegura que el monigote quepa entero */}
      <Canvas camera={{ position: [0, 1, 8], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />
        <HumanoidMesh 
          stress={patientData.stress_level} 
          age={patientData.age} 
          weight={patientData.weight} 
        />
      </Canvas>
    </div>
  );
}