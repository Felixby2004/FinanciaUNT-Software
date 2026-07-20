import { supabase } from './supabase.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3000';

/**
 * Genera un código de 6 dígitos, lo hashea y lo guarda en la BD.
 * Antes de guardar, elimina cualquier código anterior para el mismo email.
 */
export const requestVerificationCode = async (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

  // Hashear el código
  const hashedCode = await bcrypt.hash(code, SALT_ROUNDS);

  // Eliminar códigos anteriores para este email (mantener solo uno activo)
  await supabase
    .from('email_verification_codes')
    .delete()
    .eq('email', email);

  // Insertar nuevo código con hash
  const { error } = await supabase
    .from('email_verification_codes')
    .insert({
      email,
      code_hash: hashedCode,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

  if (error) {
    console.error('Error al guardar código:', error);
    throw new Error('Error al guardar el código de verificación');
  }

  // Enviar email con el código en texto plano
  try {
    const response = await fetch(`${API_BASE}/api/send-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      console.warn('Error enviando email:', data?.error || 'Unknown error');
    }
  } catch (err) {
    console.warn('No se pudo enviar el email, pero el código fue guardado.');
    console.log(`📧 Código de verificación para ${email}: ${code}`);
  }

  return code;
};

/**
 * Verifica que el código ingresado coincida con el hash almacenado,
 * que no esté expirado y que no haya sido usado.
 */
export const verifyCode = async (email, code) => {
  // Buscar el registro activo (no usado)
  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('id, code_hash, expires_at')
    .eq('email', email)
    .eq('used', false)
    .maybeSingle();

  if (error) {
    console.error('Error al verificar código:', error);
    throw new Error('Error al verificar el código');
  }
  if (!data) return false;

  // Verificar expiración
  const now = new Date();
  if (new Date(data.expires_at) < now) return false;

  // Comparar el código ingresado con el hash almacenado
  const isValid = await bcrypt.compare(code, data.code_hash);
  if (!isValid) return false;

  // Marcar como usado
  await supabase
    .from('email_verification_codes')
    .update({ used: true })
    .eq('id', data.id);

  return true;
};