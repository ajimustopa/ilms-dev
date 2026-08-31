/**
 * Projects Routes Implementation
 */
const express = require('express');
const router = express.Router();
const projectsController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Tasks & Task Hub
router.get(
  '/tasks/bucket',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getTasksBucket
);

router.get(
  '/tasks/gantt',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getTasksGantt
);

router.patch(
  '/tasks/gantt/:item_type/:raw_id/schedule',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.updateTaskGanttSchedule
);

router.get(
  '/dashboard/tasks-progress',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getTasksProgressDashboard
);

router.get(
  '/program-discussions',
  verifyJwt,
  requirePermission('manajemen.projects.discussions.view'),
  projectsController.listProgramDiscussions
);

router.post(
  '/program-discussions',
  verifyJwt,
  requirePermission('manajemen.projects.discussions.manage'),
  projectsController.createProgramDiscussion
);

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

router.delete(
  '/tasks/:id',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.deleteTask
);

router.post(
  '/tasks/:id/checklists',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.createTaskChecklist
);

router.patch(
  '/tasks/checklists/:id/toggle',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.toggleTaskChecklist
);

router.delete(
  '/tasks/checklists/:id',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.deleteTaskChecklist
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

router.delete(
  '/approval-workflows/:id',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.manage_workflow'),
  projectsController.deleteWorkflow
);

router.get(
  '/approval-requests',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.request'),
  projectsController.listApprovalRequests
);

router.get(
  '/approval-requests/:id',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.request'),
  projectsController.getApprovalRequestById
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

router.post(
  '/approval-requests/:id/resubmit',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.request'),
  projectsController.resubmitApprovalRequest
);

router.get(
  '/approval-requests/:id/actions',
  verifyJwt,
  requirePermission('manajemen.projects.approvals.request'),
  projectsController.getApprovalRequestActions
);

// ==========================================
// Timeline, Kalender, Agenda & Reminder (#Fitur 11)
// ==========================================
router.get(
  '/timeline/hierarchy',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getHierarchicalTimeline
);

router.get(
  '/calendar/events',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getCalendarEvents
);

router.get(
  '/agendas/buckets',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getAgendaBuckets
);

router.get(
  '/agendas',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.listAgendas
);

router.get(
  '/agendas/:id',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.getAgendaById
);

router.post(
  '/agendas',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.createAgenda
);

router.put(
  '/agendas/:id',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.updateAgenda
);

router.delete(
  '/agendas/:id',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.deleteAgenda
);

router.post(
  '/reminders/generate',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.generateDueReminders
);

router.get(
  '/notifications',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.listNotifications
);

router.patch(
  '/notifications/:id/read',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.markNotificationAsRead
);

router.patch(
  '/notifications/read-all',
  verifyJwt,
  requirePermission('manajemen.projects.tasks.manage_own'),
  projectsController.markAllNotificationsAsRead
);

module.exports = router;
