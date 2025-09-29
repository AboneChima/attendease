const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check that doesn't depend on database
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Minimal server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Start server
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log('No database initialization - just basic Express server');
});