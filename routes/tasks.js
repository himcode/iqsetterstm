const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasksController');
const authenticateToken = require('../middleware/authenticateToken');


router.get('/gettasks', authenticateToken, tasksController.getTasks);
router.get('/:id', authenticateToken, tasksController.getTaskById); // fetch task details by id
router.post('/', authenticateToken, tasksController.createTask);

module.exports = router;
