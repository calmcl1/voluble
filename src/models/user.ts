import * as Sequelize from "sequelize"

export interface UserAttributes {
    first_name: string,
    surname: string,
    email_address: string,
    phone_number: string,
    auth0_id: string
}

export interface UserInstance extends Sequelize.Instance<UserAttributes>{
    id: number,
    createdAt: Date,
    updatedAt: Date,

    first_name: string,
    surname: string,
    email_address: string,
    phone_number: string,
    auth0_id: string
}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var User = sequelize.define('User', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: DataTypes.STRING,
        surname: DataTypes.STRING,
        email_address: DataTypes.STRING,
        phone_number: DataTypes.STRING,
        auth0_id: DataTypes.STRING,
    })

    return Contact
}