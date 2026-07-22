import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../database.js";

export class Rol extends Model {}

Rol.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    sequelize,
    modelName: "rol",
    tableName: "roles"
});