import * as express from "express"
import * as Promise from "bluebird"
const router = express.Router();
const winston = require('winston')
const errs = require('common-errors')
import { UserManager } from '../bin/user-manager'
import user from "../models/user";

/* GET users listing. */
router.get('/', function (req, res, next) {
});

router.get('/:user_id', function (req, res, next) {
  UserManager.getUserFullProfile(req.params["user_id"])
    .then(function (user_profile) {
      res.status(200).json(user_profile)
    })
    .catch(function (error: any) {
      res.status(500).send(error.message)
    })
  //TODO: Add user authentication, make sure they're able to see the user they're asking for!
})

router.post('/', function (req, res, next) {
  if (!req.body.auth0_id) {
    res.status(400).json({
      error: "Missing field: auth0_id"
    })
    return
  }


  UserManager.getUserEntryByAuth0ID(req.body.auth0_id)
    .then(function (user_entry) {
      if (!user_entry) {
        UserManager.addNewUser(req.body.auth0_id, req.body.org_id || null)
          .then(function (new_user_entry) {
            res.status(201).json(new_user_entry)
          })
      } else {
        res.status(200).json(user_entry)
      }
    })
    .catch(function (error: any) {
      res.status(500).send(error.message)
    })
})

router.delete('/:voluble_user_id', function (req, res, next) {

  UserManager.deleteUserFromVoluble(req.params.voluble_user_id)
    .then(function (user_deleted) {
      if (user_deleted) {
        res.status(204).send()
      } else {
        res.status(500).send()
      }
    })
    .catch(errs.NotFoundError, function (error) {
      res.status(404).json({
          error: `User not found: ${req.params.voluble_user_id}`
        })
    })

})

module.exports = router;