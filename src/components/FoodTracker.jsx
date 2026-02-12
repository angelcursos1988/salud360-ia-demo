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
      // 1. Llamada a la API de análisis
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodText: foodInput })
      });
      
      const data = await response.json();

      // 2. Validación de seguridad para evitar el "undefined"
      if (!data || typeof data.calories === 'undefined') {
        throw new Error("La IA no devolvió un formato válido");
      }

      const estimatedCalories = parseInt(data.calories) || 0;

      // 3. Guardado en Supabase
      const { error } = await supabase.from('food_logs').insert([{
        patient_id: patientId,
        description: foodInput,
        calories: estimatedCalories,
        nutrients: data.nutrients || {}
      }]);

      if (!error) {
        setFoodInput('');
        // Ejecutamos el refresh del padre (ChatWindow)
        if (onFoodLogged) onFoodLogged();
        alert(`✅ Registrado: ${estimatedCalories} kcal estimadas.`);
      } else {
        throw error;
      }

    } catch (err) {
      console.error("Error al registrar comida:", err);
      alert("Hubo un problema al calcular las calorías. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      background: '#ffffff', padding: '20px', borderRadius: '20px', 
      border: '1px solid #e2e8f0', marginBottom: '20px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>🍎</span> Registro de Nutrición
      </h4>
      <form onSubmit={analyzeFood} style={{ display: 'flex', gap: '10px' }}>
        <input 
          style={{ 
            flex: 1, padding: '12px 15px', borderRadius: '12px', 
            border: '1px solid #cbd5e1', fontSize: '13px',
            outline: 'none', background: '#f8fafc'
          }}
          placeholder="¿Qué has comido? (ej: Tortilla de 2 huevos)"
          value={foodInput}
          onChange={(e) => setFoodInput(e.target.value)}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: loading ? '#94a3b8' : '#22c55e', 
            color: 'white', border: 'none', 
            padding: '0 20px', borderRadius: '12px', cursor: loading ? 'default' : 'pointer',
            fontWeight: '700', fontSize: '13px', transition: 'all 0.2s'
          }}
        >
          {loading ? '...' : 'Sumar'}
        </button>
      </form>
      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b' }}>
        La IA calculará automáticamente las calorías y macronutrientes.
      </p>
    </div>
  );
}