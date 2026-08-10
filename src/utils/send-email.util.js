import nodemailer from "nodemailer";
import "dotenv/config.js";

// ✅ CORRECTO: createTransport (SIN la 'e' final)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Configuraciones optimizadas
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000
});

// Verificar conexión al iniciar
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ Error SMTP:", error);
  } else {
    console.log("✅ SMTP listo para enviar correos");
  }
});

// Función simplificada y funcional
export async function sendEmail({ to, subject, text, html }) {
  try {
    const mailOptions = {
      from: `"Sala de belleza Alba" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'NodeMailer'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Correo enviado a:", to);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    
    // Reintento simple
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log("🔄 Reintentando envío...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendEmail({ to, subject, text, html });
    }
    
    return { success: false, error: error.message };
  }
}