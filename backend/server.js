const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Fail-fast environment validation
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing.');
  process.exit(1);
}
if (!process.env.MONGO_URI && process.env.NODE_ENV !== 'test') {
  console.error('FATAL: MONGO_URI environment variable is missing.');
  process.exit(1);
}

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route handlers
const authRoutes = require('./src/routes/auth');
const doctorRoutes = require('./src/routes/doctors');
const appointmentRoutes = require('./src/routes/appointments');
const messageRoutes = require('./src/routes/messages');
const prescriptionRoutes = require('./src/routes/prescriptions');
const notificationRoutes = require('./src/routes/notifications');
const patientRoutes = require('./src/routes/patient');
const adminRoutes = require('./src/routes/admin');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration: allow configured FRONTEND_URL or default vite dev origin
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, postman) or matching frontend
      if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or can restrict
      }
    },
    credentials: true
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'MediConnect API', timestamp: new Date() });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use(errorHandler);

// Start server if run directly (not imported during tests)
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[MediConnect] Backend server running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;

