// Schema & core types (coherent module: data model only)
export { db } from './schema'
export type {
  LocalProject,
  LocalMindmap,
  LocalTask,
  LocalSetting,
  AttachmentItem,
} from './schema'

// Repository layer: project CRUD (coherent module: project persistence)
export {
  getProjects,
  getRecentProjects,
  upsertProject,
  deleteProject,
} from './projectRepo'

// Repository layer: task CRUD (coherent module: task persistence)
export {
  getProjectTasks,
  getAllTasks,
  upsertTask,
  deleteTask,
} from './taskRepo'
