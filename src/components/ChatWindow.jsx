          setLoading(true);
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patientId, userMessage: "[SALUDO_INICIAL_SISTEMA]", systemPrompt: `Nombre: ${patientData.name}` })
            });
            const data = await res.json();
            if (data.message) setMessages(prev => [...prev, { role: 'assistant', message: data.message }]);
          } catch (e) { console.error(e); } finally { setLoading(false); }
        }
      }
    };
    triggerGreeting();
  }, [isInitialLoading, patientData]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: userText }]);
    setLoading(true);

    try {
      await supabase.from('chat_history').insert([{ patient_id: patientId, role: 'user', message: userText }]);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, userMessage: userText, systemPrompt: `Paciente: ${patientData?.name}. Peso: ${patientData?.weight}kg.` })
      });
      const data = await response.json();
      let aiText = data.message || "Error.";
      
      const updateMatch = aiText.match(/\[UPDATE:(.*?)\]/);
      if (updateMatch) {
        const updates = {};
        updateMatch[1].split(',').forEach(p => {
          const [k, v] = p.split('=');
          if (v !== 'XX' && !isNaN(v)) updates[k] = parseFloat(v);
        });
        if (Object.keys(updates).length > 0) {
          await supabase.from('patients').update(updates).eq('id', patientId);
          await supabase.from('health_logs').insert([{ patient_id: patientId, ...updates }]);
          loadAllData();
        }
      }
      const cleanText = aiText.replace(/\[UPDATE:.*?\]/g, '').replace(/\[RETO:.*?\]/g, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', message: cleanText }]);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const weight = patientData?.weight || 70;
  const heightCm = patientData?.height || 170;
  const imcReal = (heightCm > 0) ? (weight / ((heightCm / 100) ** 2)).toFixed(1) : "0.0";
  const imcIdeal = 22.0;
  const recCalories = Math.round((10 * weight) + (6.25 * heightCm) - 50 + 500);
  const dailyTotal = foodLogs.reduce((acc, curr) => acc + curr.calories, 0);

  const targets = {
    Desayuno: Math.round(recCalories * 0.20),
    Almuerzo: Math.round(recCalories * 0.10),
    Comida: Math.round(recCalories * 0.35),
    Merienda: Math.round(recCalories * 0.10),
    Cena: Math.round(recCalories * 0.20),
    Otros: Math.round(recCalories * 0.05)
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#f1f5f9', overflow: 'hidden' }}>
      <aside style={{ width: '420px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        
        {/* VISUALIZADOR (MUÑECO) */}
        <div style={{ minHeight: '350px', borderRadius: '24px', overflow: 'hidden', marginBottom: '15px', background: '#020617' }}>
          <BiometricVisualizer patientData={patientData || { weight: 70, stress_level: 5 }} />
        </div>

        {/* --- CONTENEDOR PRINCIPAL DE DATOS --- */}
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '24px', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* MÉTRICAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '4px' }}>IMC REAL / IDEAL</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24' }}>{imcReal} <span style={{color:'#64748b', fontSize:'12px'}}>/ {imcIdeal}</span></div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '4px' }}>CALORÍAS META</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e' }}>{recCalories}</div>
            </div>
          </div>

          {/* CALENDARIO (Ajustado al ancho del recuadro) */}
          <div style={{ background: '#0f172a', padding: '12px', borderRadius: '16px', border: '1px solid #334155' }}>
            <label style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px', textAlign: 'center' }}>FECHA DE CONSULTA</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '8px', border: 'none', background: 'transparent', color: 'white', fontSize: '14px', fontWeight: '700', outline: 'none', textAlign: 'center', cursor: 'pointer' }}
            />
          </div>

          {/* FOOD TRACKER INTEGRADO */}
          {selectedDate === new Date().toISOString().split('T')[0] ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <FoodTracker patientId={patientId} onFoodLogged={loadAllData} />
            </div>
          ) : (
            <div style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              Mostrando historial
            </div>
          )}

          {/* DESGLOSE NUTRICIONAL DENTRO DEL RECUADRO OSCURO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(targets).map((cat) => {
              const catItems = foodLogs.filter(f => f.category === cat);
              const catTotal = catItems.reduce((acc, curr) => acc + curr.calories, 0);
              return (
                <details key={cat} style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid #334155', overflow: 'hidden' }}>
                  <summary style={{ padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', listStyle:'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{cat}</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: catTotal > targets[cat] ? '#ef4444' : '#22c55e' }}>{catTotal} / {targets[cat]}</span>
                  </summary>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderTop:'1px solid #334155' }}>
                    {catItems.length > 0 ? catItems.map((item, i) => (
                      <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i === catItems.length -1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#94a3b8' }}>{item.description}</span>
                        <span>{item.calories}</span>
                      </div>
                    )) : <div style={{fontSize:'10px', color:'#475569', textAlign:'center'}}>Sin registros</div>}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        {/* --- PIE DE PÁGINA (RESUMEN Y BOTONES) --- */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: 'white', padding: '15px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>
               <span>CONSUMO TOTAL</span>
               <span style={{ color: dailyTotal > recCalories ? '#ef4444' : '#22c55e' }}>{dailyTotal} / {recCalories} kcal</span>
             </div>
             <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
               <div style={{ width: `${Math.min((dailyTotal / recCalories) * 100, 100)}%`, height: '100%', background: dailyTotal > recCalories ? '#ef4444' : '#22c55e', borderRadius: '10px' }} />
             </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>📄 INFORME</button>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>🚪 SALIR</button>
            </Link>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#f1f5f9' : '#ffffff', padding: '16px 20px', borderRadius: '20px', marginBottom: '16px', maxWidth: '85%', marginLeft: msg.role === 'user' ? 'auto' : '0', border: '1px solid #f1f5f9', fontSize: '14px' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
            </div>
          ))}
          {loading && <div style={{ fontSize: '11px', color: '#94a3b8', padding: '10px' }}>Salud360 analizando...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <input style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe aquí..." />
          <button type="submit" disabled={loading} style={{ background: '#22c55e', color: 'white', padding: '0 30px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>Enviar</button>
        </form>
      </main>
    </div>
  );
}