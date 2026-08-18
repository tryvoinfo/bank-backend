const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// PostgreSQL Pool Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Redis Client Connection
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

// API: Fetch All Questions
app.get('/api/questions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM questions ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Bulk Upload Questions (Admin)
app.post('/api/questions/bulk', async (req, res) => {
    const { questions } = req.body; // Array of question objects
    try {
        const queryText = `INSERT INTO questions (topic, passage, question_text, options, correct_answer) VALUES ($1, $2, $3, $4, $5)`;
        for (let q of questions) {
            await pool.query(queryText, [q.topic, q.passage, q.question_text, JSON.stringify(q.options), q.correct_answer]);
        }
        res.status(201).json({ message: `${questions.length} questions successfully imported.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Save Test Attempt & SWOT Data
app.post('/api/attempts', async (req, res) => {
    const { userId, score, accuracy, swotData } = req.body;
    try {
        const query = `INSERT INTO user_attempts (user_id, score, accuracy, swot_data) VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await pool.query(query, [userId, score, accuracy, JSON.stringify(swotData)]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));