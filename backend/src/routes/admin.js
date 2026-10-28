const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// All admin routes strictly require 'admin' role
router.use(auth, requireRole('admin'));

router.get('/doctors', adminController.getDoctors);
router.patch('/doctors/:id/approve', adminController.approveDoctor);
router.patch('/doctors/:id/reject', adminController.rejectDoctor);
router.get('/stats', adminController.getAdminStats);

module.exports = router;

