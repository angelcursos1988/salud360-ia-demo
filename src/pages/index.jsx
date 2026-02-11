import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name) return;
    const { data, error } = await supabase
      .from('patients')
      .insert([{ name }])
      .select();
    if (!error) router.push(`/chat?id=${data[0].id}`);
  };

  return (
    <div style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', fontFamily: 'sans-serif' 
    }}>
      {/* --- LOGO EN INICIO --- */}
      <img 
        src="/logo.jpg" 
        alt="Logo" 
        style={{ width: '120px', height: '120px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} 
      />
      
      <div style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>Salud360 IA</h1>
        <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Ingrese su nombre para comenzar la consulta</p>
        
        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          />
          <button type="submit" style={{ padding: '12px', background: '#16a085', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Comenzar Consulta
          </button>
        </form>
      </div>
    </div>
  );
}