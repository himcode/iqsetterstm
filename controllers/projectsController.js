// Get a project by id (only if user is a member or owner)
exports.getProjectById = async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  try {
    await ensureProjectTables();
    // Only members or owner can view
    const isMember = await db.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
    if (!isMember.rowCount) return res.status(403).json({ error: 'Not a project member' });
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Update a project (PATCH /:id)
exports.updateProject = async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  const { title, description, status, start_date, end_date } = req.body;
  try {
    await ensureProjectTables();
    // Only owner can update
    const isOwner = await db.query('SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2', [projectId, userId]);
    if (!isOwner.rowCount) return res.status(403).json({ error: 'Not project owner' });
    // Build dynamic update query
    const fields = [];
    const values = [];
    let idx = 1;
    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
    if (start_date !== undefined) { fields.push(`start_date = $${idx++}`); values.push(start_date); }
    if (end_date !== undefined) { fields.push(`end_date = $${idx++}`); values.push(end_date); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(projectId);
    const result = await db.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// controllers/projectsController.js
const db = require('../db');

// Ensure projects and project_members tables exist before any project operation
async function ensureProjectTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, user_id)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS workflow_stages (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stage_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS project_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    workflow_stage_id INTEGER REFERENCES workflow_stages(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

// Get all projects for the logged-in user (member or owner)
exports.getProjects = async (req, res) => {
  const userId = req.user.id;
  try {
  await ensureProjectTables();
    const result = await db.query(
      `SELECT p.* FROM projects p
       JOIN project_members m ON p.id = m.project_id
       WHERE m.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new project (fields from req.body)
exports.createProject = async (req, res) => {
  const { title, description, ...rest } = req.body;
  const userId = req.user.id;
  try {
  await ensureProjectTables();
    const result = await db.query(
      'INSERT INTO projects (title, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [title, description, userId]
    );
    const project = result.rows[0];
    const projectId = project.id;
    // // Add owner as member
    await db.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [projectId, userId, 'owner']);
    // Create default workflow
    const wf = await db.query('INSERT INTO workflows (project_id, name) VALUES ($1, $2) RETURNING *', [projectId, 'Default']);
    const workflowId = wf.rows[0].id;
    await db.query('INSERT INTO workflow_stages (workflow_id, name, stage_order) VALUES ($1, $2, $3)', [workflowId, 'To Do', 0]);
    res.json({ ...project, ...rest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Invite a user to a project
exports.inviteMember = async (req, res) => {
  const { userId } = req.body;
  const projectId = req.params.id;
  try {
    // Only members can invite
  const isMember = await db.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, req.user.id]);
  if (!isMember.rowCount) return res.status(403).json({ error: 'Not a project member' });
  await db.query('INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [projectId, userId]);
  res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get project members
exports.getMembers = async (req, res) => {
  const projectId = req.params.id;
  try {
    const members = await db.query(
      `SELECT u.id, u.name, u.email, m.role FROM users u
       JOIN project_members m ON u.id = m.user_id
       WHERE m.project_id = $1`,
      [projectId]
    );
    res.json(members.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get workflow stages for a project
exports.getWorkflowStages = async (req, res) => {
  const projectId = req.params.id;
  try {
  const wf = await db.query('SELECT id FROM workflows WHERE project_id = $1', [projectId]);
  if (!wf.rows.length) return res.json([]);
  const workflowId = wf.rows[0].id;
  const stages = await db.query('SELECT * FROM workflow_stages WHERE workflow_id = $1 ORDER BY stage_order', [workflowId]);
  res.json(stages.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CRUD for project tasks
exports.getProjectTasks = async (req, res) => {
  const projectId = req.params.id;
  try {
  const tasks = await db.query('SELECT * FROM project_tasks WHERE project_id = $1', [projectId]);
  res.json(tasks.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a project task (fields from req.body)
exports.createProjectTask = async (req, res) => {
  const projectId = req.params.id;
  const { assigned_to, workflow_stage_id, ...rest } = req.body;
  const userId = req.user.id;
  try {
    // Only members can create
    const isMember = await db.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
    if (!isMember.rowCount) return res.status(403).json({ error: 'Not a project member' });
    // Assignee must be a member
    if (assigned_to) {
      const isAssignee = await db.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, assigned_to]);
      if (!isAssignee.rowCount) return res.status(400).json({ error: 'Assignee not a project member' });
    }
    const result = await db.query(
      `INSERT INTO project_tasks (project_id, assigned_to, created_by, workflow_stage_id, title, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [projectId, assigned_to, userId, workflow_stage_id, rest.title, rest.description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.moveProjectTask = async (req, res) => {
  const projectId = req.params.projectId;
  const taskId = req.params.taskId;
  const { workflow_stage_id } = req.body;
  try {
    // Only members can move
    const isMember = await db.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, req.user.id]);
    if (!isMember.rowCount) return res.status(403).json({ error: 'Not a project member' });
    // Stage must be valid
    const validStage = await db.query(
      `SELECT 1 FROM workflow_stages ws
       JOIN workflows w ON ws.workflow_id = w.id
       WHERE ws.id = $1 AND w.project_id = $2`,
      [workflow_stage_id, projectId]
    );
    if (!validStage.rowCount) return res.status(400).json({ error: 'Invalid workflow stage' });
    await db.query(
      'UPDATE project_tasks SET workflow_stage_id = $1 WHERE id = $2 AND project_id = $3',
      [workflow_stage_id, taskId, projectId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
