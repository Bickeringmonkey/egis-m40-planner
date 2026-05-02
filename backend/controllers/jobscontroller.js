const db = require('../db');

async function getJobs(req, res) {
  try {
    const { activeOnly, date, closureId, workstreamId } = req.query;

    let sql = `
      SELECT 
        j.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM jobs j
      LEFT JOIN users u ON j.created_by = u.id
      WHERE 1 = 1
    `;

    const params = [];

    // Hide completed/cancelled jobs when requested
    if (activeOnly === 'true') {
      sql += `
        AND LOWER(COALESCE(j.status, '')) NOT IN (
          'completed',
          'complete',
          'cancelled',
          'canceled'
        )
      `;
    }

    // Optional date filter
    if (date) {
      sql += ` AND DATE(j.job_date) = ?`;
      params.push(date);
    }

    // Optional closure filter
    if (closureId) {
      sql += ` AND j.closure_id = ?`;
      params.push(closureId);
    }

    // Optional workstream filter, only works if your jobs table has workstream_id
    if (workstreamId) {
      sql += ` AND j.workstream_id = ?`;
      params.push(workstreamId);
    }

    sql += ` ORDER BY j.id DESC`;

    const [rows] = await db.query(sql, params);

    res.json(rows);
  } catch (err) {
    console.error('getJobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getJobById(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT 
        j.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM jobs j
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id = ?
      LIMIT 1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('getJobById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createJob(req, res) {
  try {
    const {
      title,
      description,
      status,
      job_date,
      closure_id,
      briefing_id
    } = req.body;

    const [result] = await db.query(`
      INSERT INTO jobs (
        title,
        description,
        status,
        job_date,
        closure_id,
        briefing_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      title || null,
      description || null,
      status || 'Pending',
      job_date || null,
      closure_id || null,
      briefing_id || null,
      req.user.id
    ]);

    const [rows] = await db.query(`
      SELECT 
        j.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM jobs j
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id = ?
      LIMIT 1
    `, [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateJob(req, res) {
  try {
    const {
      title,
      description,
      status,
      job_date,
      closure_id,
      briefing_id
    } = req.body;

    const [result] = await db.query(`
      UPDATE jobs
      SET
        title = ?,
        description = ?,
        status = ?,
        job_date = ?,
        closure_id = ?,
        briefing_id = ?
      WHERE id = ?
    `, [
      title || null,
      description || null,
      status || 'Pending',
      job_date || null,
      closure_id || null,
      briefing_id || null,
      req.params.id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const [rows] = await db.query(`
      SELECT 
        j.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM jobs j
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id = ?
      LIMIT 1
    `, [req.params.id]);

    res.json(rows[0]);
  } catch (err) {
    console.error('updateJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteJob(req, res) {
  try {
    const [result] = await db.query(`DELETE FROM jobs WHERE id = ?`, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('deleteJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
};