// src/lib/emailUtils.js
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || '/api'; // en producción usará la raíz del dominio

/**
 * Solicita un código de verificación para el email dado.
 * Guarda el código en la tabla `email_verification_codes` y envía el email.
 */
export const requestVerificationCode = async (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

  // Guardar en la base de datos
  const { error } = await supabase
    .from('email_verification_codes')
    .insert({ email, code, expires_at: expiresAt.toISOString(), used: false });

  if (error) throw new Error('Error al guardar el código de verificación');

  // Enviar email llamando a la API de Vercel
  try {
    const response = await fetch(`${API_URL}/send-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.warn('Error enviando email:', data?.error || 'Unknown error');
      // No lanzamos error para que el código quede guardado igualmente
    }
  } catch (err) {
    console.warn('No se pudo enviar el email, pero el código fue guardado.');
    // Mostrar el código en consola para pruebas
    console.log(`📧 Código de verificación para ${email}: ${code}`);
  }

  return code;
};

export const verifyCode = async (email, code) => {
  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('id, expires_at')
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .maybeSingle();

  if (error) throw new Error('Error al verificar el código');
  if (!data) return false;

  const now = new Date();
  if (new Date(data.expires_at) < now) return false;

  await supabase
    .from('email_verification_codes')
    .update({ used: true })
    .eq('id', data.id);

  return true;
};