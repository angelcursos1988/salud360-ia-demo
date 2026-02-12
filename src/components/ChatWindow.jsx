import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FoodTracker from './FoodTracker';

const BiometricVisualizer = dynamic(() => import('./BiometricVisualizer'), { 
  ssr: false,
  loading: () => <div style={{ height: '350px', background: '#020617', borderRadius: '20px' }} />
});

export default function ChatWindow({ patientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [dailyCalories, setDailyCalories] = useState(0); 
  const [foodLogs, setFoodLogs] = useState([]);
  const messagesEndRef = useRef(null);

  const loadAllData = async () => {
    if (!patientId) return;
    const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
    if (pData) setPatientData(pData);

    const { data: cData } = await supabase.from('chat_history').select('role, message').eq('patient_id', patientId).order('created_at', { ascending: true });
    if (cData) setMessages(cData);

    const today = new Date().toISOString().split('T')[0];
    const { data: fData } = await supabase.from('food_logs').select('*').eq('patient_id', patientId).gte('created_at', today);
    
    if (fData) {
      setFoodLogs(fData);
      setDailyCalories(fData.reduce((acc, curr) => acc + curr.calories, 0) || 0);
    }
  };

  useEffect(() => { loadAllData(); }, [patientId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- LÓGICA NUTRICIONAL ---
  const weight = patientData?.weight || 70;
  const height = (patientData?.height || 170) / 100;
  const imcReal = (weight / (height * height)).toFixed(1);
  const imcIdeal = 22.0;
  
  // Estimación de calorías recomendadas (TMB x Actividad moderada simplificada)
  const recCalories = Math.round((10 * weight) + (6.25 * (height * 100)) - 50 + 500); 

  // Reparto recomendado
  const targets = {
    Desayuno: Math.round(recCalories * 0.20),
    Almuerzo: Math.round(recCalories * 0.10),
    Comida: Math.round(recCalories * 0.35),
    Merienda: Math.round(recCalories * 0.10),
    Cena: Math.round(recCalories * 0.20),
    Otros: Math.round(recCalories * 0.05)
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        
        {/* MUÑECO 3D */}
        <div style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
          <BiometricVisualizer patientData={patientData} />
        </div>

        {/* --- NUEVO: WIDGET DE ÍNDICES BIOMÉTRICOS --- */}
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '20px', marginBottom: '15px', color: 'white' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>IMC REAL</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fbbf24' }}>{imcReal}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>IMC IDEAL</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#22c55e' }}>{imcIdeal}</div>
            </div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>RECOMENDACIÓN DIARIA</div>
            <div style={{ fontSize: '16px', fontWeight: '800' }}>🔥 {recCalories} kcal / día</div>
          </div>
        </div>

        <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />

        {/* DESPLEGABLES CON ESTIMACIÓN */}
        <div style={{ marginTop: '10px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '12px' }}>DESGLOSE VS OBJETIVO</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena', 'Otros'].map((cat) => {
              const catItems = foodLogs.filter(f => f.category === cat);
              const catTotal = catItems.reduce((acc, curr) => acc + curr.calories, 0);
              const target = targets[cat];

              return (
                <details key={cat} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <summary style={{ listStyle: 'none', padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>{cat}</span>
                      <span style={{ fontSize: '9px', color: '#94a3b8' }}>Objetivo: {target} kcal</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: catTotal > target ? '#ef4444' : '#22c55e' }}>{catTotal} kcal</div>
                    </div>
                  </summary>
                  <div style={{ padding: '0 14px 10px 14px', background: '#f8fafc', fontSize: '11px' }}>
                    {catItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span>{item.description}</span>
                        <span style={{ fontWeight: '600' }}>{item.calories}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        {/* --- TOTAL FINAL --- */}
        <div style={{ marginTop: '15px', padding: '15px', background: 'white', borderRadius: '15px', border: '2px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '13px' }}>TOTAL CONSUMIDO</span>
            <span style={{ fontWeight: '900', fontSize: '18px', color: dailyCalories > recCalories ? '#ef4444' : '#0f172a' }}>
              {dailyCalories} <small style={{fontSize: '10px', color: '#64748b'}}> / {recCalories} kcal</small>
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${Math.min((dailyCalories / recCalories) * 100, 100)}%`, 
              height: '100%', 
              background: dailyCalories > recCalories ? '#ef4444' : '#22c55e',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* BOTONES INFERIORES */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Link href="/dashboard" style={{ flex: 1 }}>
            <button style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>Panel Médico</button>
          </Link>
          <button onClick={() => window.location.href='/'} style={{ flex: 1, padding: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>Salir</button>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {/* ... (El resto del main y el form de chat se mantienen igual que tu versión anterior) ... */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#f1f5f9' : '#ffffff',
              padding: '16px 20px', borderRadius: '20px', marginBottom: '16px',
              maxWidth: '85%', marginLeft: msg.role === 'user' ? 'auto' : '0',
              border: '1px solid #f1f5f9', fontSize: '14px'
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input 
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
          />
          <button type="submit" style={{ background: '#22c55e', color: 'white', padding: '0 25px', borderRadius: '14px', fontWeight: '700', border: 'none' }}>Enviar</button>
        </form>
      </main>
    </div>
  );
}