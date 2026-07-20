export const requestVerificationCode = async (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const { error } = await supabase
    .from('email_verification_codes')
    .insert({ email, code, expires_at: expiresAt.toISOString(), used: false });

  if (error) throw new Error('Error al guardar el código');

  // Enviar a la API de Vercel
  try {
    const response = await fetch('/api/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al enviar email');
    }
  } catch (err) {
    console.warn('No se pudo enviar el email, pero el código fue guardado.');
    // Para depuración, mostrar código en consola
    console.log(`📧 Código de verificación para ${email}: ${code}`);
  }

  return code;
};