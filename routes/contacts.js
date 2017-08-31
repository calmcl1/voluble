var express = require('express');
var router = express.Router();
var dbClient = require('mariasql');
var Q = require('q');

var client = new dbClient({
  host: 'localhost',
  user: 'root',
  password: ''
});


/**
 * 
 * @param {string} id String to confirm is a valid integer
 * @returns {Q.promise} containing value of the ID number as integer
 */
function verifyIdIsInteger(id) {
  let deferred = Q.defer()

  let parsed_id = parseInt(id)
  if (!parsed_id) {
    deferred.reject(new Error("Supplied ID is not an integer"))
  }
  else {
    console.log("ID is valid: " + parsed_id)
    deferred.resolve(parsed_id)
  }

  return deferred.promise
}

/**
 * Removes a contact with ID `id` from the database
 * @param {integer} id ID of contact to remove
 * @returns {Q.promise}
 */

function deleteContactFromDB(id) {
  let deferred = Q.defer()
  client.query("DELETE FROM voluble.contacts WHERE id = ?", [id], true, function (err, rows) {
    if (err) { deferred.reject(err) }
    else {
      console.log("Successfully deleted contact " + id)
      deferred.resolve()
    }
  })

  return deferred.promise
}

/**
 * Queries the database to make sure confirm that the contact with id `id` exists
 * @param {integer} id Contact ID number
 * @returns {Q.promise} with value `id` if contact exists
 */
function checkContactWithIDExists(id) {
  let deferred = Q.defer()
  client.query("SELECT id FROM voluble.contacts WHERE id = ?", [id], { useArray: true }, function (err, rows) {
    if (err) { deferred.reject(err) }
    else if (!rows.length) {
      deferred.reject(new Error("Contact with this ID does not exist."))
    }
    else deferred.resolve(id)
  })
  return deferred.promise
}

/**
 * Queries the database to retrieve the info for contact with ID `id`
 * @param {integer} id Contact ID number
 * @returns {Q.promise} with JSON data containing user info
 */
function getContactWithId(id) {
  let deferred = Q.defer()
  client.query("SELECT * FROM voluble.contacts WHERE id = ?", [id], { useArray: true }, function (err, rows) {
    if (err) { deferred.reject(err) }
    else {
      deferred.resolve(rows[0])
    }
  })

  return deferred.promise
}

/**
 * Does UPDATE DB operation to update a Contact's detail. Usually called by `updateContactDetailsWithId`.
 * @param {integer} id ID of contact to update
 * @param {string} field_name Name of the parameter to update, e.g. first_name
 * @param {string} new_value Value to insert at `field_name`
 */
function updateSingleContactDetailWithId(id, field_name, new_value) {
  let deferred = Q.defer()

  client.query("UPDATE voluble.contacts SET " + field_name + " = ? WHERE id = ?", [new_value, id], function (err, rows) {
    if (err) {
      deferred.reject(err)
    } else {
      deferred.resolve()
    }

  })

  return deferred.promise
}

/**
 * Updates the details of a single Contact. Internally calls updateSingleContactDetailWithId for each detail change.
 * @param {integer} id ID of the Contact whose details will be updated
 * @param {object} updatedDetails Object containing a mapping of parameter names to new values, e.g {first_name: 'Adam', surname: 'Smith'}
 */
function updateContactDetailsWithId(id, updatedDetails) {
  /* Expect `updatedDetail` could be like:
  {
    first_name: "Derek",
    email_address: "steve@apple.com"
  }
  */
  promises = []

  for (detail in updatedDetails){
    promises.push(updateSingleContactDetailWithId(id, detail, updatedDetails[detail]))
  }
  return Q.all(promises)
}


router.get('/', function (req, res, next) {

  let prep = client.prepare("SELECT * FROM `voluble`.`contacts` ORDER BY id ASC")
  let q = client.query(prep())
  let contacts = []

  q.on('result', function (result) {
    result.on('data', function (row) {
      row.url = req.protocol + '://' + req.get('host') + "/contacts/" + row.id
      contacts.push(row)
    })
  }).on('end', function () {
    res.json(contacts).status(200)
  })
})

router.get('/:contact_id', function (req, res, next) {

  verifyIdIsInteger(req.params.contact_id)
    .then(function (id) {
      return checkContactWithIDExists(id)
    })
    .then(function (id) {
      return getContactWithId(id)
    }).then(function (user) {
      res.status(200).json(user)
    })
    .catch(function (error) {
      res.status(500).send(error.message)
    })
    .done()

})

function addContactToDB(first_name, surname, email) {
  let deferred = Q.defer()

  let prep = client.prepare("INSERT INTO `voluble`.`contacts` (`first_name`, `surname`, `email_address`, `default_servicechain`) VALUES (?, ?, ?, '1')")
  client.query(prep([first_name, surname, email]), function (err, rows) {
    if (err) {
      deferred.reject(err)
    }

    deferred.resolve(client.lastInsertId())
  })

  return deferred.promise
}

/* Note: this is boilerplate and has NOT been implemented yet */
router.post('/', function (req, res, next) {
  addContactToDB(req.body.first_name, req.body.surname, req.body.email_address)
    .then(function (newContactID) {
      res.status(200).send("New contact: ID " + newContactID)
    })
    .catch(function (error) {
      console.log(error)
      res.status(500).end()
    })
    .done()

})

/* Note: this is boilerplate and has NOT been implemented yet */
router.put('/:contact_id', function (req, res, next) {

  verifyIdIsInteger(req.params.contact_id)
    .then(function (id) {
      return checkContactWithIDExists(id)
    })
    .then(function (id) {
      return updateContactDetailsWithId(id, req.body)
    })
    .then(function(){
      res.status(200).end()
    })
    .catch(function (err) {
      console.log(err)
      res.status(500).send(err)
    })
    .done()

})

router.delete('/:contact_id', function (req, res, next) {
  verifyIdIsInteger(req.params.contact_id)
    .then(function (contact_id) {
      return deleteContactFromDB(contact_id)
    })
    .then(function () {
      res.send("Successfully deleted contact " + req.params.contact_id)
    })
    .catch(function (error) {
      console.log(error.message)
      res.status(500).end()
    })
    .done()
})

module.exports = router;