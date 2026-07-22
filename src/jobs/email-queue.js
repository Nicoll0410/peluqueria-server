// jobs/email-queue.js
import { sendEmail } from "../utils/send-email.util.js";

class EmailQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  // Agregar email a la cola
  addEmail(emailData) {
    this.queue.push({
      ...emailData,
      timestamp: new Date(),
      attempts: 0
    });
    console.log(`📨 Email agregado a la cola. Total en cola: ${this.queue.length}`);
    this.processQueue();
  }

  // Procesar la cola
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const emailData = this.queue[0]; // Tomar el primero sin remover todavía
      
      try {
        await sendEmail(emailData);
        this.queue.shift(); // Remover solo si se envía exitosamente
        console.log(`✅ Email procesado. Quedan: ${this.queue.length}`);
      } catch (error) {
        console.error("❌ Error enviando email:", error.message);
        emailData.attempts += 1;
        
        // Si ha fallado 3 veces, quitarlo de la cola
        if (emailData.attempts >= 3) {
          this.queue.shift();
          console.error("❌ Email removido después de 3 intentos fallidos");
        }
      }
      
      // Esperar 1 segundo entre emails para no saturar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.isProcessing = false;
  }
}

// Exportar una instancia única
export const emailQueue = new EmailQueue();