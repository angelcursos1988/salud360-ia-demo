import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim() || !supabase) return;

    setLoading(true);
    try {
      // 1. Buscamos si el paciente ya existe. 
      // Usamos .order y .limit(1) para evitar el error de múltiples filas (PGRST116)
      let { data: patient, error: searchError } = await supabase
        .from('patients')
        .select('id')
        .eq('name', name.trim())
        .order('created_at', { ascending: false }) // Traer el más nuevo primero
        .limit(1)
        .maybeSingle();

      if (searchError) throw searchError;

      // 2. Si no existe ningún registro con ese nombre, lo creamos
      if (!patient) {
        const { data: newPatient, error: createError } = await supabase
          .from('patients')
          .insert([{ name: name.trim() }])
          .select()
          .single();
        
        if (createError) throw createError;
        patient = newPatient;
      }

      // 3. Redirigir al chat con el ID del perfil encontrado o creado
      router.push(`/chat?id=${patient.id}`);
    } catch (error) {
      console.error("Error al acceder:", error);
      alert("Hubo un error al cargar tu perfil. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', background: '#f4f7f6', fontFamily: 'sans-serif' 
    }}>
      <div style={{ 
        background: 'white', padding: '40px', borderRadius: '15px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center', 
        maxWidth: '400px', width: '90%' 
      }}>
        <img src="/logo.jpg" alt="Salud360" style={{ width: '80px', marginBottom: '20px', borderRadius: '12px' }} />
        <h1 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '24px' }}>Salud360 Nutrición</h1>
        <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Ingresa tu nombre para continuar tu plan personalizado.</p>
        
        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Escribe tu nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ 
              padding: '12px', borderRadius: '8px', border: '1px solid #ddd', 
              fontSize: '16px', outline: 'none' 
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ 
              padding: '12px', borderRadius: '8px', border: 'none', 
              background: '#27ae60', color: 'white', fontWeight: 'bold', 
              cursor: 'pointer', fontSize: '16px' 
            }}
          >
            {loading ? 'Buscando perfil...' : 'Entrar a mi Plan'}
          </button>
        </form>
      </div>
    </div>
  );
}