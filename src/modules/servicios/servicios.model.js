import { Model, DataTypes } from "sequelize"
import { sequelize } from "../../database.js";

export class Servicio extends Model { }

Servicio.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    duracionMaxima: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    duracionMaximaConvertido: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    duracionRedondeada: {  // Nuevo campo para almacenar la duración redondeada
        type: DataTypes.TIME,
        allowNull: true,
    },
    precio: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: "servicio",
    hooks: {
        beforeSave: (servicio, options) => {
            // Calcular duración redondeada automáticamente al guardar
            if (servicio.duracionMaxima) {
                const [h, m] = servicio.duracionMaxima.split(':').map(Number);
                const totalMinutos = h * 60 + m;
                let redondeado;
                
                if (totalMinutos <= 30) redondeado = 30;
                else if (totalMinutos <= 60) redondeado = 60;
                else if (totalMinutos <= 90) redondeado = 90;
                else redondeado = Math.ceil(totalMinutos / 30) * 30;
                
                const horas = Math.floor(redondeado / 60);
                const minutos = redondeado % 60;
                servicio.duracionRedondeada = `${horas}:${minutos.toString().padStart(2, '0')}:00`;
            }
        }
    }
});