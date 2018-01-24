import * as Sequelize from "sequelize"

export interface ContactAttributes {
    first_name: String,
    surname: String,
    email_address: String,
    phone_number: String,
    default_servicechain: number
}

export interface ContactInstance extends Sequelize.Instance<ContactAttributes>{
    id: number,
    createdAt: Date,
    updatedAt: Date,

    first_name: String,
    surname: String,
    email_address: String,
    phone_number: String,
    default_servicechain: number
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Contact = sequelize.define('Contact', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: DataTypes.STRING,
        surname: DataTypes.STRING,
        email_address: DataTypes.STRING,
        phone_number: DataTypes.STRING,
        default_servicechain: DataTypes.INTEGER,
    })

    return Contact
}