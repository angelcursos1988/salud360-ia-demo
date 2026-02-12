import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FoodTracker({ patientId, onFoodLogged }) {
  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeFood = async (e) => {
    e.preventDefault();
    if (!foodInput.trim()) return;
    setLoading(true);

    try {
      // Llamamos a una nueva ruta de API que analiza la comida
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodText: foodInput })
      });
      
      const data = await response.json(); // { calories: 450, nutrients: {...} }

      // Guardamos en Supabase
      const { error } = await supabase.from('food_logs').insert([{
        patient_id: patientId,
        description: foodInput,
        calories: data.calories,
        nutrients: data.nutrients
      }]);

      if (!error) {
        setFoodInput('');
        if (onFoodLogged) onFoodLogged();
        alert(`Registrado: ${data.calories} kcal estimadas.`);
      }
    } catch (err) {
      console.error("Error al analizar comida:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      background: '#f8fafc', padding: '20px', borderRadius: '20px', 
      border: '1px solid #e2e8f0', marginBottom: '20px' 
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1e293b' }}>🍎 Registro de Comidas</h4>
      <form onSubmit={analyzeFood} style={{ display: 'flex', gap: '10px' }}>
        <input 
          style={{ 
            flex: 1, padding: '10px 15px', borderRadius: '10px', 
            border: '1px solid #cbd5e1', fontSize: '13px' 
          }}
          placeholder="Ej: Desayuné 2 huevos y una tostada..."
          value={foodInput}
          onChange={(e) => setFoodInput(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: '#22c55e', color: 'white', border: 'none', 
            padding: '10px 15px', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px'
          }}
        >
          {loading ? '...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}