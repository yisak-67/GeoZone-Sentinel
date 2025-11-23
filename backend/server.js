require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allows requests from any frontend domain
app.use(express.json());

// Database Connection
// Note: Ensure your DATABASE_URL is correct in your .env file or environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/geozone_db'
});

// Helper to transform DB rows to frontend objects
// IMPORTANT: Parse lat/lng as floats because some PG drivers return them as strings
const transformZone = (row) => ({
  id: row.id.toString(),
  name: row.name,
  radiusMeters: row.radius_meters,
  description: row.description,
  center: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) }
});

// GET /api/health - Simple check to see if server is running
app.get('/api/health', async (req, res) => {
  try {
    // Optional: Check DB connection
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// GET /api/zones - List all zones
app.get('/api/zones', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        name, 
        radius_meters, 
        description,
        ST_Y(center::geometry) as lat, 
        ST_X(center::geometry) as lng 
      FROM zones
      ORDER BY id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows.map(transformZone));
  } catch (err) {
    console.error('Error fetching zones:', err);
    // Hint for common error
    if (err.code === '42P01') {
      return res.status(500).json({ error: 'Table "zones" does not exist. Did you run schema.sql?' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/zones - Create a new zone
app.post('/api/zones', async (req, res) => {
  const { name, center, radiusMeters, description } = req.body;
  
  if (!name || !center || !radiusMeters) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `
      INSERT INTO zones (name, radius_meters, center, description)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)
      RETURNING 
        id, 
        name, 
        radius_meters, 
        description,
        ST_Y(center::geometry) as lat, 
        ST_X(center::geometry) as lng
    `;
    // Note: ST_MakePoint takes (lng, lat)
    const values = [name, radiusMeters, center.lng, center.lat, description];
    const result = await pool.query(query, values);
    
    res.status(201).json(transformZone(result.rows[0]));
  } catch (err) {
    console.error('Error creating zone:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/check-location - Check if point is in any zone
app.post('/api/check-location', async (req, res) => {
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  try {
    const query = `
      SELECT 
        id, 
        name, 
        radius_meters, 
        description,
        ST_Y(center::geometry) as lat, 
        ST_X(center::geometry) as lng
      FROM zones
      WHERE ST_DWithin(
        center, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        radius_meters
      )
    `;
    // Note: ST_MakePoint takes (lng, lat)
    const result = await pool.query(query, [lng, lat]);
    
    const matchedZones = result.rows.map(transformZone);

    res.json({
      inZone: matchedZones.length > 0,
      matchedZones,
      userLocation: { lat, lng }
    });
  } catch (err) {
    console.error('Error checking location:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`GeoZone Backend running on port ${PORT}`);
  console.log(`Check: curl http://localhost:${PORT}/api/health`);
});
