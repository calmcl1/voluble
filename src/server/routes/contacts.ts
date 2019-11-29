import * as express from "express";
import * as libphonenumber from 'google-libphonenumber';
import * as validator from 'validator';
import { scopes } from "voluble-common";
import { ContactManager, CategoryManager } from '../../contact-manager';
import { MessageManager } from '../../message-manager';
import { OrgManager } from "../../org-manager";
import { ServicechainManager } from '../../servicechain-manager';
import { InvalidParameterValueError, ResourceNotFoundError } from '../../voluble-errors';
import { checkJwt, checkJwtErr, checkScopesMiddleware } from '../security/jwt';
import { checkHasOrgAccess, checkHasOrgAccessMiddleware, hasScope, ResourceOutOfUserScopeError, setupUserOrganizationMiddleware } from '../security/scopes';

const router = express.Router();
const winston = require('winston')

/**
 * Handles the route `GET /contacts`.
 * Lists the first 100 of the contacts available to the user, with a given offset
 */
router.get('/:org_id/contacts', checkJwt,
  checkJwtErr,
  checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  async function (req, res, next) {
    try {
      // TODO: Add a `limit` parameter to specify amount, rather than 100
      // If the GET param 'offset' is supplied, use it. Otherwise, use 0.
      let offset: number = req.query.offset ? validator.toInt(req.query.offset) : 0
      if (isNaN(offset) || offset < 0) {
        throw new InvalidParameterValueError(`Value supplied for parameter 'offset' is invalid: ${offset}`)
      }

      checkHasOrgAccess(req.user, req.params.org_id)
      let contacts = await ContactManager.getHundredContacts(offset, req.params.org_id)
      res.status(200).jsend.success(contacts)
    } catch (e) {
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).jsend.fail("User does not have the necessary scopes to access this resource")
      } else if (e instanceof InvalidParameterValueError) {
        res.status(400).jsend.fail(`Parameter 'name' was not provided`)
      } else {
        winston.error(e)
        res.status(500).jsend.error(e)
      }
    }
  })

/**
 * Handles the route `GET /contacts/{id}`.
 * Lists all of the details available about the contact with a given ID.
 */
router.get('/:org_id/contacts/:contact_id', checkJwt, checkJwtErr, checkScopesMiddleware([scopes.ContactView, scopes.VolubleAdmin]), checkJwt, function (req, res, next) {
  ContactManager.checkContactWithIDExists(req.params.contact_id)
    .then(function (id) {
      return ContactManager.getContactWithId(id)
    })
    .then(function (user) {
      if (user) {
        res.status(200).jsend.success(user)
      } else { throw new ResourceNotFoundError(`User with ID ${req.params.contact_id} is not found!`) }
    })
    .catch(ResourceNotFoundError, function (error) {
      res.status(404).jsend.fail(error.message)
    })
    .catch(function (error: any) {
      res.status(500).jsend.error(error.message)
    })

})

/**
 * Handles the route `POST /contacts/`.
 * Inserts a new Contact into the database with the details specified in the request body.
 * 
 * 
 */
router.post('/:org_id/contacts', checkJwt, checkJwtErr,
  checkScopesMiddleware([scopes.ContactAdd, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  async function (req, res, next) {

    try {
      let contact_fname = req.body["first_name"]
      let contact_sname = req.body["surname"]
      let contact_email = req.body["email_address"]
      let contact_phone = req.body["phone_number"]
      let contact_sc = req.body["ServicechainId"]
      let contact_cat = req.body["CategoryId"]
      let contact_org = req.params.org_id

      checkHasOrgAccess(req.user, contact_org)

      if (!contact_fname || !contact_sname || !contact_phone || !contact_sc) {
        throw new InvalidParameterValueError("First name, surname, phone number, Organization, or Servicechain not supplied.")
      }

      if (contact_email && (!(typeof contact_email == "string") || !validator.isEmail(contact_email, { require_tld: true }))) {
        //console.log(validator.isEmail(contact_email, { require_tld: true }))
        throw new InvalidParameterValueError("Supplied parameter 'email_address' is not the correct format: " + contact_email)
      }

      let e164_phone_num: string
      const phone_util = libphonenumber.PhoneNumberUtil.getInstance()
      try {
        phone_util.isValidNumber(phone_util.parse(contact_phone))
        e164_phone_num = phone_util.format(phone_util.parse(contact_phone), libphonenumber.PhoneNumberFormat.E164)
      } catch {
        throw new InvalidParameterValueError("Supplied parameter 'phone_number' is not the correct format: " + contact_phone)
      }

      if (contact_cat && (!await CategoryManager.getCategoryById(contact_cat))) {
        throw new InvalidParameterValueError(`Supplied Category not found: ${contact_cat}`)
      }

      if (! await ServicechainManager.getServicechainById(contact_sc)) {
        throw new ResourceNotFoundError(`Specified Servicechain ID ${contact_sc} does not exist`)
      }

      let requested_org = await OrgManager.getOrganizationById(contact_org)
      if (!requested_org) {
        throw new ResourceNotFoundError(`Organization with ID ${contact_org} not found`)
      }

      let created_contact = await requested_org.createContact({
        ServicechainId: contact_sc,
        CategoryId: contact_cat,
        first_name: contact_fname,
        surname: contact_sname,
        email_address: contact_email,
        phone_number: e164_phone_num
      })

      res.status(201).jsend.success(await created_contact.reload())
    } catch (e) {
      if (e instanceof ResourceNotFoundError || e instanceof InvalidParameterValueError) {
        res.status(400).jsend.fail(e.message)
      } else if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).jsend.fail(e.message)
      }
      else {
        winston.error(e.name, e.message)
        res.status(500).jsend.error(e.message)
      }
    }


  })

/**
 * Handles the route `PUT /contacts/{id}`.
 * Updates the details for the Contact with the specified ID with the details provided in the request body.
 */
router.put('/:org_id/contacts/:contact_id', checkJwt, checkJwtErr,
  checkScopesMiddleware([scopes.ContactEdit, scopes.VolubleAdmin]), async function (req, res, next) {
    try {
      checkHasOrgAccess(req.user, req.params.org_id)

      let contact = await ContactManager.getContactWithId(req.params.contact_id)
      if (!contact) { throw new ResourceNotFoundError(`Contact not found: ${req.params.contact_id}`) }

      if ('CategoryId' in Object.keys(req.body)) {
        let cat = await CategoryManager.getCategoryById(req.body.CategoryId)
        if (!cat) { throw new InvalidParameterValueError(`Category does not exist: ${req.body.CategoryId}`) }
        await contact.setCategory(req.body.CategoryId ? cat.id : null)
      }

      if ('ServicechainId' in Object.keys(req.body)) {
        let sc = await ServicechainManager.getServicechainById(req.body.ServicechainId)
        if (!sc) { throw new InvalidParameterValueError(`Servicechain does not exist: ${req.body.ServicechainId}`) }
        await contact.setServicechain(sc)
      }

      ["first_name", "surname", "phone_number", "email_address"].forEach(trait => {
        //TODO: Validate phone no and email
        if (Object.keys(req.body).indexOf(trait) > -1) {
          contact.set(trait, req.body[trait])
        }
      });

      await contact.save()

      res.status(200).jsend.success(await contact.reload())
    } catch (e) {
      if (e instanceof ResourceOutOfUserScopeError) {
        res.status(403).jsend.fail({ name: e.name, message: e.message })
      }
      else if (e instanceof InvalidParameterValueError) {
        res.status(400).jsend.fail({ name: e.name, message: e.message })
      } else {
        winston.error(e)
        res.status(500).jsend.error({ name: e.name, message: e.message })
      }
    }
  })

/**
 * Handles the route `DELETE /contacts/{id}`.
 * Removes the contact with the specified ID from the database.
 * Returns 200 even if the contact does not exist, to ensure idempotence. This is why there is no validation that the contact exists first.
 */
router.delete('/:org_id/contacts/:contact_id',
  checkJwt,
  checkJwtErr,
  setupUserOrganizationMiddleware,
  checkHasOrgAccessMiddleware,
  checkScopesMiddleware([scopes.ContactDelete, scopes.VolubleAdmin]), function (req, res, next) {

    let contact_id = req.params.contact_id

    return ContactManager.getContactWithId(contact_id)
      .then(function (contact) {
        if (!contact) {
          return false // Because idempotence
        }

        return contact.destroy()
          .then(function () { return true })
      })
      .then(function (resp) {
        res.status(resp ? 200 : 404).jsend.success(true)
      })
      .catch(function (error: any) {
        res.status(500).jsend.error(error.message)
      })
  })

router.get('/:org_id/contacts/:contact_id/messages', checkJwt,
  checkJwtErr,
  checkScopesMiddleware([scopes.MessageRead, scopes.VolubleAdmin]),
  setupUserOrganizationMiddleware,
  function (req, res, next) {
    let contact_id = req.params.contact_id
    MessageManager.getMessagesForContact(contact_id)
      .then(function (messages) {
        res.status(200).jsend.success({ messages })
      })
      .catch(function (err) {
        if (err instanceof ResourceNotFoundError) {
          res.status(404).jsend.fail({ "id": "No contact exists with this ID." })
        } else {
          res.status(500).jsend.error(err)
        }
      })
  })

module.exports = router;