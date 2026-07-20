// src/lib/emailUtils.js
import { supabase } from './supabase';

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

  // Enviar email usando la Edge Function
  try {
    const { data, error: invokeError } = await supabase.functions.invoke('send-verification-email', {
      body: { email, code },
    });

    if (invokeError) {
      console.warn('Error al invocar Edge Function:', invokeError);
      // Fallback: mostrar el código en consola para pruebas
      console.log(`📧 Código de verificación para ${email}: ${code}`);
      return code;
    }

    if (!data?.success) {
      console.warn('El envío del email falló, pero el código fue guardado.');
      console.log(`📧 Código de verificación para ${email}: ${code}`);
    }

    return code;
  } catch (err) {
    console.warn('No se pudo enviar el email, pero el código fue guardado.');
    console.log(`📧 Código de verificación para ${email}: ${code}`);
    return code;
  }
};

/**
 * Verifica que el código sea válido, no expirado y no usado.
 * Marca el código como usado si es válido.
 */
export const verifyCode = async (email, code) => {
  // Buscar código válido
  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('id, expires_at')
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .maybeSingle();

  if (error) throw new Error('Error al verificar el código');
  if (!data) return false;

  // Verificar expiración
  const now = new Date();
  if (new Date(data.expires_at) < now) return false;

  // Marcar como usado
  await supabase
    .from('email_verification_codes')
    .update({ used: true })
    .eq('id', data.id);

  return true;
};