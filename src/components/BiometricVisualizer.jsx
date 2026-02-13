import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Capsule, OrbitControls, ContactShadows, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

// Componente para un segmento del cuerpo (reutilizable)
const BodyPart = ({ position, args, color, scale = [1, 1, 1], rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Capsule args={args}>
        <meshPhysicalMaterial 
          color={color} 
          roughness={0.4}   // Aspecto mate suave (tipo piel o goma)
          metalness={0.1} 
          clearcoat={0.3}   // Un poco de brillo "premium"
          clearcoatRoughness={0.2}
        />
      </Capsule>
    </group>
  );
};

// Componente de la Articulación (Esferas de conexión estilo Michelin)
const Joint = ({ position, size, color }) => (
  <mesh position={position}>
    <sphereGeometry args={[size, 24, 24]} />
    <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.3} />
  </mesh>
);

function MichelinHuman({ patientData, petData }) {
  const group = useRef();
  
  // 1. Lógica de Color (Salud)
  const skinColor = useMemo(() => {
    const health = petData?.health ?? 100;
    if (health < 40) return "#f87171"; // Rojo suave
    if (health < 70) return "#facc15"; // Amarillo suave
    return "#38bdf8"; // Azul Celeste (Saludable/Neutro)
  }, [petData]);

  // 2. Lógica de Forma (Peso/IMC)
  // Calculamos un factor de "volumen" basado en el peso.
  // Base 70kg = 1. Si pesa 100kg, el factor sube.
  const fatFactor = useMemo(() => {
    const weight = patientData?.weight || 70;
    // Normalizamos: 0.8 (muy delgado) a 1.5 (obesidad)
    return Math.max(0.8, Math.min(1.6, weight / 70));
  }, [patientData]);

  // Animación suave de respiración
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
        // Flotar ligeramente
        group.current.position.y = -1 + Math.sin(t * 1) * 0.05;
        // Respiración (escalado sutil del pecho)
        const breathe = 1 + Math.sin(t * 2) * 0.02;
        // Solo afectamos la escala global sutilmente
        group.current.scale.setScalar(1); 
    }
  });

  return (
    <group ref={group} position={[0, -1, 0]}>
      
      {/* --- CABEZA --- */}
      <BodyPart position={[0, 2.9, 0]} args={[0.35, 0.4, 4, 16]} color={skinColor} />
      
      {/* --- TORSO (Segmentado estilo Michelin) --- */}
      {/* Pecho Superior */}
      <BodyPart 
        position={[0, 2.2, 0]} 
        args={[0.45 * fatFactor, 0.5, 4, 16]} // El ancho reacciona al peso
        color={skinColor} 
      />
      {/* Abdomen */}
      <BodyPart 
        position={[0, 1.6, 0]} 
        args={[0.42 * (fatFactor * 1.1), 0.5, 4, 16]} // La barriga crece más rápido
        color={skinColor} 
      />
      {/* Caderas */}
      <BodyPart 
        position={[0, 1.0, 0]} 
        args={[0.43 * fatFactor, 0.4, 4, 16]} 
        color={skinColor} 
      />

      {/* --- BRAZOS (Simétricos) --- */}
      {/* Hombros (Joints) */}
      <Joint position={[0.6 * fatFactor, 2.3, 0]} size={0.3} color={skinColor} />
      <Joint position={[-0.6 * fatFactor, 2.3, 0]} size={0.3} color={skinColor} />

      {/* Brazo Superior */}
      <BodyPart position={[0.75 * fatFactor, 1.8, 0]} rotation={[0, 0, 0.2]} args={[0.18 * fatFactor, 0.7, 4, 16]} color={skinColor} />
      <BodyPart position={[-0.75 * fatFactor, 1.8, 0]} rotation={[0, 0, -0.2]} args={[0.18 * fatFactor, 0.7, 4, 16]} color={skinColor} />

      {/* Antebrazo */}
      <BodyPart position={[0.9 * fatFactor, 1.0, 0.2]} rotation={[0.2, 0, 0.1]} args={[0.16 * fatFactor, 0.7, 4, 16]} color={skinColor} />
      <BodyPart position={[-0.9 * fatFactor, 1.0, 0.2]} rotation={[0.2, 0, -0.1]} args={[0.16 * fatFactor, 0.7, 4, 16]} color={skinColor} />


      {/* --- PIERNAS --- */}
      {/* Muslos */}
      <BodyPart position={[0.3, 0.4, 0]} args={[0.22 * fatFactor, 0.9, 4, 16]} color={skinColor} />
      <BodyPart position={[-0.3, 0.4, 0]} args={[0.22 * fatFactor, 0.9, 4, 16]} color={skinColor} />

      {/* Pantorrillas */}
      <BodyPart position={[0.3, -0.6, 0]} args={[0.18 * fatFactor, 0.9, 4, 16]} color={skinColor} />
      <BodyPart position={[-0.3, -0.6, 0]} args={[0.18 * fatFactor, 0.9, 4, 16]} color={skinColor} />

      {/* Pies */}
      <BodyPart position={[0.3, -1.1, 0.1]} rotation={[1.5, 0, 0]} args={[0.15, 0.4, 4, 16]} color={skinColor} />
      <BodyPart position={[-0.3, -1.1, 0.1]} rotation={[1.5, 0, 0]} args={[0.15, 0.4, 4, 16]} color={skinColor} />

    </group>
  );
}

export default function BiometricVisualizer({ patientData, petData, isMini = false }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={{ height: isMini ? '150px' : '350px', background: '#e2e8f0' }} />;

  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '150px' : '350px', 
      background: 'radial-gradient(circle at 50% 30%, #f8fafc 0%, #cbd5e1 100%)', // Fondo claro clínico
      borderRadius: isMini ? '12px' : '24px', 
      overflow: 'hidden', 
      position: 'relative' 
    }}>
      
      {/* DATOS FLOTANTES */}
      {!isMini && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
            <h3 style={{ margin: 0, color: '#475569', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Bio-Avatar v1.0
            </h3>
            <p style={{ margin: 0, color: '#0f172a', fontWeight: 'bold', fontSize: '20px' }}>
                {petData?.name || 'Usuario'}
            </p>
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#64748b' }}>
                IMC Estimado: {((patientData?.weight || 70) / ((1.75*1.75))).toFixed(1)}
            </div>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 1, 5.5], fov: 45 }}>
        {/* ILUMINACIÓN DE ESTUDIO (Para que se vea real y con volumen) */}
        <ambientLight intensity={0.6} />
        <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#blue" />
        
        {/* Entorno para reflejos suaves en el material */}
        <Environment preset="city" />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
            <MichelinHuman patientData={patientData} petData={petData} />
        </Float>

        <ContactShadows position={[0, -2.4, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
        <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 1.8} />
      </Canvas>
    </div>
  );
}