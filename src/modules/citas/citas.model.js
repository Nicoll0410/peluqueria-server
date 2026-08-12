import { Model, DataTypes, Op } from "sequelize";
import { sequelize } from "../../database.js";
import { format, sub } from "date-fns";
import cron from "node-cron";

export class Cita extends Model { }

Cita.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    pacienteID: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "clientes",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    pacienteTemporalNombre: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: {
          msg: "El nombre del cliente temporal no puede estar vacío",
          args: true,
        },
        len: {
          args: [2, 50],
          msg: "El nombre debe tener entre 2 y 50 caracteres",
        },
      },
    },
    pacienteTemporalTelefono: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        is: {
          args: /^[0-9]{10}$/,
          msg: "El teléfono debe tener 10 dígitos numéricos",
        },
      },
    },
    barberoID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    servicioID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    serviciosAdicionales: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    precioTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "En barbería",
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fechaFormateada: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    horaFin: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    duracionReal: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    duracionRedondeada: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("Cancelada", "Expirada", "Completa", "Pendiente", "Confirmada"),
      allowNull: false,
      defaultValue: "Confirmada",
    },
    // ✅ DESCOMENTADO: Campo para recordatorios
    recordatorio_enviado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
  },
  {
    sequelize,
    modelName: "cita",
    tableName: "cita",
    hooks: {
      beforeCreate: (cita) => {
        if (cita.pacienteID === null) {
          cita.pacienteID = undefined;
        }
      },
      beforeValidate: (cita) => {
        if (cita.isNewRecord) {
          cita.estado = "Confirmada";
        }

        const fecha = new Date(`${cita.fecha}T00:00:00-05:00`);

        cita.fechaFormateada = fecha.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      },
    },
  }
);

// Método para verificar disponibilidad mejorado
Cita.verificarDisponibilidad = async function (barberoID, fecha, hora, duracionMinutos = 30) {
  const [horaH, horaM] = hora.split(":").map(Number);
  const horaFinM = (horaM + duracionMinutos) % 60;
  const horaFinH = horaH + Math.floor((horaM + duracionMinutos) / 60);
  const horaFin = `${horaFinH.toString().padStart(2, "0")}:${horaFinM.toString().padStart(2, "0")}:00`;

  const citaExistente = await this.findOne({
    where: {
      barberoID,
      fecha,
      estado: { [Op.notIn]: ["Cancelada", "Expirada"] },
      [Op.or]: [
        {
          hora: {
            [Op.lt]: horaFin,
            [Op.gte]: hora,
          },
        },
        {
          horaFin: {
            [Op.gt]: hora,
            [Op.lte]: horaFin,
          },
        },
        {
          [Op.and]: [
            { hora: { [Op.lte]: hora } },
            { horaFin: { [Op.gte]: horaFin } },
          ],
        },
      ],
    },
  });

  return !citaExistente;
};

// ✅ JOB 1: Completar citas automáticamente
const task = cron.schedule(
  "* * * * *",
  async () => {
    try {
      const ahora = new Date();
      const fechaActual = format(ahora, "yyyy-MM-dd");
      const horaActual = format(ahora, "HH:mm:ss");

      const ahoraConTolerancia = new Date(ahora.getTime() + 5 * 60000);
      const horaActualConTolerancia = format(ahoraConTolerancia, "HH:mm:ss");

      const citasParaCompletar = await Cita.findAll({
        where: {
          estado: "Confirmada",
          [Op.or]: [
            {
              fecha: {
                [Op.lt]: fechaActual,
              },
            },
            {
              [Op.and]: [
                { fecha: fechaActual },
                { horaFin: { [Op.lte]: horaActualConTolerancia } },
              ],
            },
          ],
        },
      });

      if (citasParaCompletar.length > 0) {
        await Cita.update(
          { estado: "Completa" },
          {
            where: {
              id: {
                [Op.in]: citasParaCompletar.map((c) => c.id),
              },
            },
          }
        );

        console.log(`✅ Se completaron ${citasParaCompletar.length} citas automáticamente`);
      }
    } catch (error) {
      console.error("❌ Error en tarea programada de citas:", error);
    }
  },
  {
    scheduled: false,
  }
);

// ✅ JOB 2: CORREGIDO - Enviar recordatorios 20 minutos antes
const recordatorioTask = cron.schedule(
  "* * * * *", // Ejecutar cada minuto
  async () => {
    try {
      const ahora = new Date();

      // Calcular 20 minutos en el futuro
      const en20Minutos = new Date(ahora.getTime() + 20 * 60000);

      // ✅ Usar la fecha de HOY, no la fecha futura
      const fechaHoy = format(ahora, "yyyy-MM-dd");

      // ✅ Calcular la hora de 20 minutos después
      const horaEn20MinInicio = format(en20Minutos, "HH:mm");
      const horaEn20MinFin = format(new Date(en20Minutos.getTime() + 60000), "HH:mm");

      // Importar modelos necesarios dinámicamente
      const { Barbero } = await import("../barberos/barberos.model.js");
      const { Cliente } = await import("../clientes/clientes.model.js");
      const { Servicio } = await import("../servicios/servicios.model.js");
      const { Usuario } = await import("../usuarios/usuarios.model.js");

      // ✅ Buscar citas para HOY que empiecen en 20 minutos
      const citasParaRecordar = await Cita.findAll({
        where: {
          estado: "Confirmada",
          fecha: fechaHoy,  // ✅ HOY, no la fecha futura
          recordatorio_enviado: false,
          hora: {
            [Op.gte]: `${horaEn20MinInicio}:00`,
            [Op.lte]: `${horaEn20MinFin}:59`
          }
        },
        include: [
          {
            model: Barbero,
            as: "barbero",
            include: [{ model: Usuario, as: "usuario" }]
          },
          {
            model: Cliente,
            as: "cliente",
            include: [{ model: Usuario, as: "usuario" }]
          },
          {
            model: Servicio,
            as: "servicio"
          }
        ]
      });

      if (citasParaRecordar.length > 0) {
        console.log(`📧 Enviando recordatorios para ${citasParaRecordar.length} citas`);

        for (const cita of citasParaRecordar) {
          try {
            // Obtener emails
            const emailBarbero = cita.barbero?.usuario?.email;
            let emailCliente = null;

            if (cita.pacienteID && cita.cliente?.usuario?.email) {
              emailCliente = cita.cliente.usuario.email;
            }

            const fechaHora = new Date(`${cita.fecha}T${cita.hora}`);

            // Importar utilidades de email
            const { correos } = await import("../../utils/correos.util.js");
            const { sendEmail } = await import("../../utils/send-email.util.js");

            // ✅ Enviar email al barbero
            if (emailBarbero) {
              const clienteNombre = cita.pacienteID
                ? cita.cliente?.nombre
                : cita.pacienteTemporalNombre;

              const emailContent = correos.recordatorioCita({
                destinatario: 'barbero',
                cliente_nombre: clienteNombre,
                fecha_hora: fechaHora,
                servicio_nombre: cita.servicio?.nombre || 'Servicio'
              });

              await sendEmail({
                to: emailBarbero,
                subject: '⏰ Recordatorio: Cita en 20 minutos',
                html: emailContent
              });

              console.log(`✅ Recordatorio enviado al barbero: ${emailBarbero}`);
            }

            // ✅ Enviar email al cliente (si existe y tiene email)
            if (emailCliente) {
              const emailContent = correos.recordatorioCita({
                destinatario: 'cliente',
                barbero_nombre: cita.barbero?.nombre,
                fecha_hora: fechaHora,
                servicio_nombre: cita.servicio?.nombre || 'Servicio'
              });

              await sendEmail({
                to: emailCliente,
                subject: '⏰ Recordatorio: Tu cita en 20 minutos',
                html: emailContent
              });

              console.log(`✅ Recordatorio enviado al cliente: ${emailCliente}`);
            }

            // ✅ Marcar como enviado
            await cita.update({ recordatorio_enviado: true });

          } catch (emailError) {
            console.error(`❌ Error enviando recordatorio para cita ${cita.id}:`, emailError);
          }
        }
      }

    } catch (error) {
      console.error("❌ Error en tarea de recordatorios:", error);
    }
  },
  {
    scheduled: false,
  }
);

// ✅ Exportar ambos jobs
export { task, recordatorioTask };
export default Cita;