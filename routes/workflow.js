// routes/workflow.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const workflowController = require('../controllers/workflowController');

// All routes require authentication
router.use(authenticateToken);

// Get all workflows and their stages for a project
router.get('/project/:id', workflowController.getWorkflowsWithStages);

// You can add more workflow routes here, e.g.:
router.post('/', workflowController.createWorkflow);
router.patch('/:workflowId', workflowController.updateWorkflow);
router.delete('/:workflowId', workflowController.deleteWorkflow);
router.post('/:workflowId/stages', workflowController.createStage);
router.patch('/stages/:stageId', workflowController.updateStage);
router.delete('/stages/:stageId', workflowController.deleteStage);

module.exports = router;
