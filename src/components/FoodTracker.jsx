import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FoodTracker({ patientId, onFoodLogged }) {
  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeFood = async (e) => {
    e.preventDefault();
    if (!foodInput.trim() || loading) return;
    setLoading(true);

    try {
      // 1. Llamada a la API de análisis (Groq)
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodText: foodInput })
      });
      
      const data = await response.json();

      // 2. Validación de seguridad
      if (!data || typeof data.calories === 'undefined') {
        throw new Error("La IA no devolvió un formato válido");
      }

      const estimatedCalories = parseInt(data.calories) || 0;
      const detectedCategory = data.category || 'Otros'; // Nueva variable de categoría

      // 3. Guardado en Supabase (Asegúrate de tener la columna 'category' en tu tabla)
      const { error } = await supabase.from('food_logs').insert([{
        patient_id: patientId,
        description: foodInput,
        calories: estimatedCalories,
        category: detectedCategory, // Guardamos la categoría clasificada
        nutrients: data.nutrients || {}
      }]);

      if (!error) {
        setFoodInput('');
        // Ejecutamos el refresh del padre para que el desplegable se actualice
        if (onFoodLogged) onFoodLogged();
        alert(`✅ ${detectedCategory} registrado: ${estimatedCalories} kcal.`);
      } else {
        throw error;
      }

    } catch (err) {
      console.error("Error al registrar comida:", err);
      alert("Hubo un problema al procesar la información. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      background: '#ffffff', padding: '20px', borderRadius: '24px', 
      border: '1px solid #e2e8f0', marginBottom: '20px',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
    }}>
      <h4 style={{ 
        margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', 
        display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' 
      }}>
        <span style={{ fontSize: '20px' }}>🥗</span> Registro de Nutrición IA
      </h4>
      
      <form onSubmit={analyzeFood} style={{ display: 'flex', gap: '10px' }}>
        <input 
          style={{ 
            flex: 1, padding: '14px 16px', borderRadius: '14px', 
            border: '1px solid #cbd5e1', fontSize: '13px',
            outline: 'none', background: '#f8fafc',
            transition: 'border 0.2s'
          }}
          placeholder="Ej: Desayuné tostadas con aguacate..."
          value={foodInput}
          onChange={(e) => setFoodInput(e.target.value)}
          disabled={loading}
          onFocus={(e) => e.target.style.border = '1px solid #22c55e'}
          onBlur={(e) => e.target.style.border = '1px solid #cbd5e1'}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: loading ? '#94a3b8' : '#22c55e', 
            color: 'white', border: 'none', 
            padding: '0 20px', borderRadius: '14px', 
            cursor: loading ? 'default' : 'pointer',
            fontWeight: '700', fontSize: '13px', 
            boxShadow: loading ? 'none' : '0 4px 6px -1px rgba(34, 197, 94, 0.2)'
          }}
        >
          {loading ? '...' : 'Registrar'}
        </button>
      </form>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
          La IA clasificará automáticamente la comida.
        </p>
      </div>
    </div>
  );
}