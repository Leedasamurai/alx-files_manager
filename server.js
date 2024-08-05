// server.js
const express = require('express');

const app = express();
const routes = require('./routes/index');

// Port setup
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Load routes
app.use('/', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
