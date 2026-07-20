import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  try {
    const { email, code } = await req.json();
    
    const { data, error } = await resend.emails.send({
      from: 'FinanciaUNT <verificacion@tudominio.com>', // Cambia por tu dominio verificado en Resend
      to: [email],
      subject: '🔐 Código de verificación - FinanciaUNT',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
          <h2 style="color: #1F3A93; text-align: center;">Verifica tu correo</h2>
          <p style="font-size: 16px; color: #333;">¡Hola!</p>
          <p style="font-size: 14px; color: #666;">Usa el siguiente código para completar tu registro:</p>
          <div style="background-color: #f0f0f0; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #1F3A93; letter-spacing: 5px; margin: 0;">${code}</p>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">Este código expirará en 10 minutos.</p>
        </div>
      `,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error enviando email:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
});