import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getPatient = async (patientId) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();
  if (error) console.error('Error:', error);
  return data;
};

export const saveMessage = async (patientId, role, message) => {
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
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });
  if (error) console.error('Error:', error);
  return data || [];
};