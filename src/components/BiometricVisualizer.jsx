import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function StatusMesh({ stress, age, weight }) {
  const meshRef = useRef();
  
  // 1. Lógica de COLOR (Basada en Estrés)
  const color = useMemo(() => {
    // 0 = Verde (HSL 120°), 10 = Rojo (HSL 0°)
    const hue = ((10 - stress) * 12) / 360; 
    return new THREE.Color().setHSL(hue, 0.8, 0.5);
  }, [stress]);

  // 2. Lógica de GEOMETRÍA (Basada en Edad)
  // Pacientes jóvenes = formas simples. Pacientes mayores = redes complejas.
  const detail = useMemo(() => {
    if (age < 20) return 12;
    if (age < 50) return 32;
    return 64; // Alta densidad de red
  }, [age]);

  // 3. Lógica de ESCALA (Basada en Peso)
  // Normalizamos el peso (ejemplo: 70kg es escala 1)
  const baseScale = useMemo(() => {
    return Math.max(0.5, Math.min(weight / 70, 2.5));
  }, [weight]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Rotación según estrés
    meshRef.current.rotation.y += 0.005 + (stress * 0.02);
    meshRef.current.rotation.x += 0.005;

    // Vibración (Latido clínico)
    // Si hay mucho estrés ( > 7), el latido es errático y rápido
    const pulseSpeed = stress > 7 ? 8 : 2;
    const pulseAmount = stress > 7 ? 0.15 : 0.05;
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
        opacity={0.9}
        emissive={color}
        emissiveIntensity={stress / 10}
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
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <StatusMesh 
          stress={patientData.stress_level || 0} 
          age={patientData.age || 30} 
          weight={patientData.weight || 70} 
        />
      </Canvas>
    </div>
  );
}