const db = require('../db');

exports.getTasks = async (req, res) => {
  const userId = req.user.id;
  const { project_id } = req.query;
  try {
    let query = 'SELECT * FROM tasks WHERE created_by = $1 OR assigned_to = $1';
    let params = [userId];
    if (project_id) {
      query += ' AND project_id = $2';
      params.push(project_id);
    }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

exports.createTask = async (req, res) => {
  const userId = req.user.id;
  const { title, description, status, priority, project_id, assigned_to, due_date ,createdBy} = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  try {
    // Ensure tasks table exists
    await db.query(`CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      project_id INTEGER,
      assigned_to INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      due_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    // If project_id is provided, check user is a member of the project
    if (project_id) {
      const projectMember = await db.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [project_id, userId]
      );
      if (projectMember.rows.length === 0) {
        return res.status(403).json({ message: 'You are not a member of this project' });
      }
      // If assigned_to is provided, check they are a member of the project
      if (assigned_to) {
        const assignedMember = await db.query(
          'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
          [project_id, assigned_to]
        );
        if (assignedMember.rows.length === 0) {
          return res.status(400).json({ message: 'Assigned user is not a member of this project' });
        }
      }
    }
    const result = await db.query(
      `INSERT INTO tasks (title, description, status, priority, project_id, assigned_to, created_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, status, priority, null, assigned_to, createdBy, due_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
  console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};
