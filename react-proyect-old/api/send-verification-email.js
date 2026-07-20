// api/send-verification-email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    const { data, error } = await resend.emails.send({
      from: 'FinanciaUNT <verificacion@financiaunt.com>', // Cambia por tu dominio verificado en Resend
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}