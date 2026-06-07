const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');

router.get('/', EventController.getCatalog);
router.get('/:id', EventController.getSingleEvent);

module.exports = router;
