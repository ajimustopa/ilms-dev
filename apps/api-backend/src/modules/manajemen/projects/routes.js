/**
 * Projects Routes Implementation
 */
const express = require('express');
const router = express.Router();
const projectsController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Tasks (#198)
router.get(
  '/tasks',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.listTasks
);

router.get(
  '/tasks/:id',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getTaskById
);

router.post(
  '/tasks',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.createTask
);

router.put(
  '/tasks/:id',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.updateTask
);

router.patch(
  '/tasks/:id/status',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.updateTaskStatus
);

router.post(
  '/tasks/:id/comments',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.addComment
);

// Projects (#199)
router.get(
  '/projects',
  verifyJwt,
  requirePermission('manajemen.projects.view_own'),
  projectsController.listProjects
);

router.get(
  '/projects/:id',
  verifyJwt,
  requirePermission('manajemen.projects.view_own'),
  projectsController.getProjectById
);

router.post(
  '/projects',
  verifyJwt,
  requirePermission('manajemen.projects.manage'),
  projectsController.createProject
);

router.put(
  '/projects/:id',
  verifyJwt,
  requirePermission('manajemen.projects.manage'),
  projectsController.updateProject
);

router.patch(
  '/projects/:id/status',
  verifyJwt,
  requirePermission('manajemen.projects.manage'),
  projectsController.updateProjectStatus
);

router.post(
  '/projects/:id/members',
  verifyJwt,
  requirePermission('manajemen.projects.manage'),
  projectsController.addProjectMember
);

router.delete(
  '/projects/:id/members/:employee_id',
  verifyJwt,
  requirePermission('manajemen.projects.manage'),
  projectsController.removeProjectMember
);

// Approval Workflows (#200)
router.get(
  '/approval-workflows',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.manage_workflow'),
  projectsController.listWorkflows
);

router.post(
  '/approval-workflows',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.manage_workflow'),
  projectsController.createWorkflow
);

router.get(
  '/approval-requests',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.request'),
  projectsController.listApprovalRequests
);

router.post(
  '/approval-requests',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.request'),
  projectsController.createApprovalRequest
);

router.patch(
  '/approval-requests/:id/action',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.act'),
  projectsController.actOnApprovalRequest
);

router.get(
  '/approval-requests/:id/actions',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.request'),
  projectsController.getApprovalRequestActions
);

module.exports = router;
