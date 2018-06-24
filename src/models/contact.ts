import * as Sequelize from "sequelize"

export interface ContactAttributes {
    first_name: string,
    surname: string,
    email_address: string,
    phone_number: string,
    defaultServicechainId: number,
    id: string
}

export interface ContactInstance extends Sequelize.Instance<ContactAttributes> {
    id: string,
    createdAt: Date,
    updatedAt: Date,

    first_name: string,
    surname: string,
    email_address: string,
    phone_number: string,
    defaultServicechainId: number
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Contact = sequelize.define('Contact', {
        id: { type: DataTypes.STRING, primaryKey: true },
        first_name: { type: DataTypes.STRING, allowNull: false },
        surname: { type: DataTypes.STRING, allowNull: false },
        email_address: { type: DataTypes.STRING, validate: { isEmail: true } },
        phone_number: { type: DataTypes.STRING, allowNull: false },
    })

    return Contact
}