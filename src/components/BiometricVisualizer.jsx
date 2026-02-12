import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function HumanoidMesh({ stress, age, weight }) {
  const groupRef = useRef();

  // Color basado en estrés
  const color = useMemo(() => {
    const hue = ((10 - Number(stress)) * 12) / 360;
    return new THREE.Color().setHSL(hue, 0.8, 0.5);
  }, [stress]);

  // Escala basada en peso (afecta al grosor del torso)
  const bodyWidth = useMemo(() => {
    return Math.max(0.7, Math.min(Number(weight) / 70, 1.5));
  }, [weight]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Rotación suave
    groupRef.current.rotation.y += 0.01;

    // Latido (vibración por estrés)
    const pulse = Math.sin(time * (Number(stress) > 7 ? 8 : 2)) * 0.05;
    groupRef.current.position.y = pulse;
  });

  const materialProps = {
    color: color,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
    emissive: color,
    emissiveIntensity: Number(stress) / 8
  };

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* CABEZA */}
      <mesh position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* TORSO (Cambia con el peso) */}
      <mesh position={[0, 1.8, 0]}>
        <capsuleGeometry args={[0.4 * bodyWidth, 1, 4, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* BRAZOS */}
      <mesh position={[-0.7, 2, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.15, 0.8, 4, 12]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      <mesh position={[0.7, 2, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.15, 0.8, 4, 12]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* PIERNAS */}
      <mesh position={[-0.3, 0.6, 0]}>
        <capsuleGeometry args={[0.18, 1, 4, 12]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      <mesh position={[0.3, 0.6, 0]}>
        <capsuleGeometry args={[0.18, 1, 4, 12]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </group>
  );
}

export default function BiometricVisualizer({ patientData }) {
  if (!patientData) return null;

  return (
    <div style={{ 
      width: '100%', 
      height: '350px', 
      background: 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)', // Fondo oscuro para resaltar la malla
      borderRadius: '20px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute', top: '15px', left: '15px', zIndex: 1,
        fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase'
      }}>
        Escaneo Biométrico Corporal v2.0
      </div>
      
      <Canvas camera={{ position: [0, 1, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <HumanoidMesh 
          stress={patientData.stress_level || 0} 
          age={patientData.age || 30} 
          weight={patientData.weight || 70} 
        />
      </Canvas>
    </div>
  );
}