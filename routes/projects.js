// routes/projects.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const projectsController = require('../controllers/projectsController');

// All routes require authentication
router.use(authenticateToken);

// Projects

router.get('/', projectsController.getProjects);
router.get('/:id', projectsController.getProjectById); // get project by id
router.post('/', projectsController.createProject);

router.put('/:id', projectsController.updateProject); // <-- update project
router.post('/:id/invite', projectsController.inviteMember);
router.get('/:id/members', projectsController.getMembers);
router.get('/:id/workflow-stages', projectsController.getWorkflowStages);

// Project tasks
router.get('/:id/tasks', projectsController.getProjectTasks);
router.post('/', projectsController.createProjectTask);
router.patch('/:projectId/tasks/:taskId/move', projectsController.moveProjectTask);

module.exports = router;
