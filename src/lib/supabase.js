import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Exportamos la instancia solo si existen las llaves, para no romper el build
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const getPatient = async (patientId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();
  if (error) console.error('Error:', error);
  return data;
};

export const saveMessage = async (patientId, role, message) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('chat_history')
    .insert({
      patient_id: patientId,
      role,
      message
    });
  if (error) console.error('Error:', error);
};

export const getChatHistory = async (patientId) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });
  if (error) console.error('Error:', error);
  return data || [];
};