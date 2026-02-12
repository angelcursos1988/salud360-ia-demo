import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function StatusMesh({ stress, age, weight }) {
  const meshRef = useRef();
  
  // Color basado en estrés (Verde a Rojo)
  const color = useMemo(() => {
    const hue = ((10 - Number(stress)) * 12) / 360; 
    return new THREE.Color().setHSL(hue, 0.8, 0.5);
  }, [stress]);

  // Geometría basada en edad
  const detail = useMemo(() => {
    const a = Number(age);
    if (a < 20) return 12;
    if (a < 50) return 32;
    return 64; 
  }, [age]);

  // Escala basada en peso
  const baseScale = useMemo(() => {
    const w = Number(weight);
    return Math.max(0.5, Math.min(w / 70, 2.5));
  }, [weight]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    
    meshRef.current.rotation.y += 0.005 + (Number(stress) * 0.02);
    meshRef.current.rotation.x += 0.005;

    const pulseSpeed = Number(stress) > 7 ? 8 : 2;
    const pulseAmount = Number(stress) > 7 ? 0.15 : 0.05;
    const s = baseScale + Math.sin(time * pulseSpeed) * pulseAmount;
    
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, detail, detail]} />
      <meshStandardMaterial 
        color={color} 
        wireframe 
        transparent
        opacity={0.8}
        emissive={color}
        emissiveIntensity={Number(stress) / 10}
      />
    </mesh>
  );
}

export default function BiometricVisualizer({ patientData }) {
  if (!patientData) return null;

  return (
    <div style={{ 
      width: '100%', 
      height: '300px', 
      background: 'radial-gradient(circle, #ffffff 0%, #f1f5f9 100%)', 
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute', top: '15px', left: '15px', zIndex: 1,
        fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase'
      }}>
        Análisis Biométrico 3D v1.0
      </div>
      
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <StatusMesh 
          stress={patientData.stress_level || 0} 
          age={patientData.age || 30} 
          weight={patientData.weight || 70} 
        />
      </Canvas>
    </div>
  );
}