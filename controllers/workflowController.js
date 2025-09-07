// Create a new workflow for a project
exports.createWorkflow = async (req, res) => {
  const { project_id, name } = req.body;
  if (!project_id || !name) return res.status(400).json({ error: 'project_id and name required' });
  try {
    const result = await db.query(
      'INSERT INTO workflows (project_id, name) VALUES ($1, $2) RETURNING *',
      [project_id, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a workflow
exports.updateWorkflow = async (req, res) => {
  const workflowId = req.params.workflowId;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const result = await db.query(
      'UPDATE workflows SET name = $1 WHERE id = $2 RETURNING *',
      [name, workflowId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a workflow
exports.deleteWorkflow = async (req, res) => {
  const workflowId = req.params.workflowId;
  try {
    const result = await db.query('DELETE FROM workflows WHERE id = $1 RETURNING *', [workflowId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new stage for a workflow
exports.createStage = async (req, res) => {
  const workflowId = req.params.workflowId;
  const { name, stage_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const result = await db.query(
      'INSERT INTO workflow_stages (workflow_id, name, stage_order) VALUES ($1, $2, $3) RETURNING *',
      [workflowId, name, stage_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a stage
exports.updateStage = async (req, res) => {
  const stageId = req.params.stageId;
  const { name, stage_order } = req.body;
  if (!name && stage_order === undefined) return res.status(400).json({ error: 'Nothing to update' });
  const fields = [];
  const values = [];
  let idx = 1;
  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (stage_order !== undefined) { fields.push(`stage_order = $${idx++}`); values.push(stage_order); }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(stageId);
  try {
    const result = await db.query(
      `UPDATE workflow_stages SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Stage not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a stage
exports.deleteStage = async (req, res) => {
  const stageId = req.params.stageId;
  try {
    const result = await db.query('DELETE FROM workflow_stages WHERE id = $1 RETURNING *', [stageId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Stage not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// controllers/workflowController.js
const db = require('../db');

// Get all workflows and their stages for a project
exports.getWorkflowsWithStages = async (req, res) => {
  const projectId = req.params.id;
  try {
    const workflows = await db.query('SELECT * FROM workflows WHERE project_id = $1', [projectId]);
    if (!workflows.rows.length) return res.json([]);
    const result = [];
    for (const wf of workflows.rows) {
      const stages = await db.query('SELECT * FROM workflow_stages WHERE workflow_id = $1 ORDER BY stage_order', [wf.id]);
      result.push({
        workflow: wf,
        stages: stages.rows
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// You can add more workflow-related APIs here, e.g. createWorkflow, updateWorkflow, deleteWorkflow, etc.
