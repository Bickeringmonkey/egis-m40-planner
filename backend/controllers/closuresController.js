const db = require('../db');

async function getClosures(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM closures c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('getClosures error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getClosureById(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM closures c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
      LIMIT 1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Closure not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('getClosureById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createClosure(req, res) {
  try {
    const {
      title,
      location,
      closure_date,
      status,
      notes
    } = req.body;

    const [result] = await db.query(`
      INSERT INTO closures (
        title,
        location,
        closure_date,
        status,
        notes,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title || null,
      location || null,
      closure_date || null,
      status || 'Planned',
      notes || null,
      req.user.id
    ]);

    const [rows] = await db.query(`
      SELECT 
        c.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM closures c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
      LIMIT 1
    `, [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createClosure error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateClosure(req, res) {
  try {
    const {
      title,
      location,
      closure_date,
      status,
      notes
    } = req.body;

    const [result] = await db.query(`
      UPDATE closures
      SET
        title = ?,
        location = ?,
        closure_date = ?,
        status = ?,
        notes = ?
      WHERE id = ?
    `, [
      title || null,
      location || null,
      closure_date || null,
      status || 'Planned',
      notes || null,
      req.params.id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Closure not found' });
    }

    const [rows] = await db.query(`
      SELECT 
        c.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM closures c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
      LIMIT 1
    `, [req.params.id]);

    res.json(rows[0]);
  } catch (err) {
    console.error('updateClosure error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteClosure(req, res) {
  try {
    const [result] = await db.query(`DELETE FROM closures WHERE id = ?`, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Closure not found' });
    }

    res.json({ message: 'Closure deleted' });
  } catch (err) {
    console.error('deleteClosure error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getClosures,
  getClosureById,
  createClosure,
  updateClosure,
  deleteClosure,
};