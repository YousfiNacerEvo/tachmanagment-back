require('dotenv').config();

console.log('Starting application...');

const express = require('express');
console.log('Express loaded successfully');

const cors = require('cors');
console.log('CORS loaded successfully');

console.log('Loading routes...');
const projectRoutes = require('./routes/projectRoutes');
console.log('Project routes loaded successfully');

const taskRoutes = require('./routes/taskRoutes');
console.log('Task routes loaded successfully');

const userRoutes = require('./routes/userRoutes');
console.log('User routes loaded successfully');

const app = express();
console.log('Express app created successfully');

const PORT = process.env.PORT || 4000;
console.log(`Port configured: ${PORT}`);

app.use(cors());
console.log('CORS middleware applied');

app.use(express.json());
console.log('JSON middleware applied');

app.use('/api/projects', projectRoutes);
console.log('Project routes mounted');

app.use('/api/tasks', taskRoutes);
console.log('Task routes mounted');

app.use('/api/users', userRoutes);
console.log('User routes mounted');

// Add a simple test route
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.json({ message: 'Backend is running!' });
});

console.log('About to start listening on port:', PORT);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Server is ready to accept connections');
});

// Add error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
