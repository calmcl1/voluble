import * as Sequelize from "sequelize"
import { UserInstance, UserAttributes } from "./user";
import { ContactAttributes, ContactInstance } from "./contact"

export interface OrgAttributes {
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,

    name: string,
    auth0_id: string
}

export interface OrgInstance extends Sequelize.Instance<OrgAttributes>, OrgAttributes {
    getUsers: Sequelize.HasManyGetAssociationsMixin<UserInstance>
    setUsers: Sequelize.HasManySetAssociationsMixin<UserInstance, UserInstance['id']>,
    addUser: Sequelize.HasManyAddAssociationMixin<UserInstance, UserInstance['id']>,
    addUsers: Sequelize.HasManyAddAssociationsMixin<UserInstance, UserInstance['id']>,
    createUser: Sequelize.HasManyCreateAssociationMixin<UserAttributes, UserInstance>,
    countUsers: Sequelize.HasManyCountAssociationsMixin
    hasUser: Sequelize.HasManyHasAssociationMixin<UserInstance, UserInstance['id']>,
    hasUsers: Sequelize.HasManyHasAssociationsMixin<UserInstance, UserInstance['id']>,
    removeUser: Sequelize.HasManyRemoveAssociationMixin<UserAttributes, UserInstance['id']>,
    removeUsers: Sequelize.HasManyRemoveAssociationsMixin<UserInstance, UserInstance['id']>

    getContacts: Sequelize.HasManyGetAssociationsMixin<ContactInstance>
    setContacts: Sequelize.HasManySetAssociationsMixin<ContactInstance, ContactInstance['id']>,
    addContact: Sequelize.HasManyAddAssociationMixin<ContactInstance, ContactInstance['id']>,
    addContacts: Sequelize.HasManyAddAssociationsMixin<ContactInstance, ContactInstance['id']>,
    createContact: Sequelize.HasManyCreateAssociationMixin<ContactAttributes, ContactInstance>,
    countContacts: Sequelize.HasManyCountAssociationsMixin
    hasContact: Sequelize.HasManyHasAssociationMixin<ContactInstance, ContactInstance['id']>,
    hasContacts: Sequelize.HasManyHasAssociationsMixin<ContactInstance, ContactInstance['id']>,
    removeContact: Sequelize.HasManyRemoveAssociationMixin<ContactAttributes, ContactInstance['id']>,
    removeContacts: Sequelize.HasManyRemoveAssociationsMixin<ContactInstance, ContactInstance['id']>

}

export default function (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes) {
    var Organization = sequelize.define('Organization', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING
    })

    return Organization
}