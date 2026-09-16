import { listTools } from './tools/registry.js';

const toolSchemas = listTools().map((t) => ({
  slug: t.slug,
  name: t.name,
  category: t.category,
  description: t.description,
  inputType: t.inputType,
  acceptedFormats: t.acceptedFormats,
  outputFormat: t.outputFormat,
  status: t.status,
  limits: t.limits,
  paramsSchema: t.paramsSchema ?? {},
}));

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TOOLVERSE AI Backend API',
    version: '1.0.0',
    description:
      'Backend-only API for the all-in-one AI tools + file-converter platform. Frontend consumes these endpoints. Auth via Bearer JWT or tv_ API key. File tools use multipart field "files".',
  },
  servers: [{ url: '/api', description: 'API base' }],
  security: [{ bearerAuth: [] }, { apiKey: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      Tool: {
        type: 'object',
        properties: {
          slug: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' },
          description: { type: 'string' }, inputType: { type: 'string' },
          acceptedFormats: { type: 'array', items: { type: 'string' } },
          outputFormat: { type: 'string' }, status: { type: 'string' },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string' }, tool_id: { type: 'string' }, status: { type: 'string', enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
          progress: { type: 'number' }, input_files: { type: 'array', items: { type: 'object' } },
          output_files: { type: 'array', items: { type: 'object' } },
          error_code: { type: 'string', nullable: true }, error_message: { type: 'string', nullable: true },
          created_at: { type: 'string' }, started_at: { type: 'string', nullable: true }, completed_at: { type: 'string', nullable: true },
        },
      },
      Error: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
    },
  },
  paths: {
    '/auth/register': { post: { summary: 'Register', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } }, required: ['email', 'password'] } } } }, responses: { '201': { description: 'Created' } } } },
    '/auth/login': { post: { summary: 'Login', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } } }, responses: { '200': { description: 'OK' } } } },
    '/auth/logout': { post: { summary: 'Logout', responses: { '200': { description: 'OK' } } } },
    '/auth/forgot-password': { post: { summary: 'Forgot password', responses: { '200': { description: 'OK' } } } },
    '/auth/reset-password': { post: { summary: 'Reset password', responses: { '200': { description: 'OK' } } } },
    '/auth/me': { get: { summary: 'Current user', responses: { '200': { description: 'OK' } } } },
    '/tools': { get: { summary: 'List tools', responses: { '200': { description: 'List of tools' } } } },
    '/tools/{slug}': { get: { summary: 'Get tool', parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/tools/{toolId}/process': {
      post: {
        summary: 'Process (enqueue job, returns jobId immediately)',
        parameters: [{ name: 'toolId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { files: { type: 'string', format: 'binary' }, text: { type: 'string' }, params: { type: 'string' } } } }, 'application/json': { schema: { type: 'object' } } } },
        responses: { '202': { description: 'Queued' } },
      },
    },
    '/jobs/{jobId}': { get: { summary: 'Job status (poll)', parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/jobs/{jobId}/cancel': { post: { summary: 'Cancel job', parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/jobs/{jobId}/download': { get: { summary: 'Download output (owner JWT or ?token= signed token)', parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'fileId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'token', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'File bytes' } } } },
    '/user/jobs': { get: { summary: 'My jobs', responses: { '200': { description: 'OK' } } } },
    '/user/files': { get: { summary: 'My files', responses: { '200': { description: 'OK' } } } },
    '/user/usage': { get: { summary: 'My usage', responses: { '200': { description: 'OK' } } } },
    '/blog': { get: { summary: 'List posts', responses: { '200': { description: 'OK' } } } },
    '/blog/{slug}': { get: { summary: 'Get post', responses: { '200': { description: 'OK' } } } },
    '/admin/users': { get: { summary: 'Admin: users', responses: { '200': { description: 'OK' } } } },
    '/admin/jobs': { get: { summary: 'Admin: jobs', responses: { '200': { description: 'OK' } } } },
    '/admin/statistics': { get: { summary: 'Admin: stats', responses: { '200': { description: 'OK' } } } },
    '/admin/tools': { get: { summary: 'Admin: tools', responses: { '200': { description: 'OK' } } }, post: { summary: 'Admin: create tool override', responses: { '200': { description: 'OK' } } } },
    '/admin/tools/{id}': { patch: { summary: 'Admin: update tool', responses: { '200': { description: 'OK' } } } },
    '/admin/blog': { get: { summary: 'Admin: list all posts', responses: { '200': { description: 'OK' } } }, post: { summary: 'Admin: create post', responses: { '200': { description: 'OK' } } } },
    '/admin/blog/{id}': { patch: { summary: 'Admin: update post', responses: { '200': { description: 'OK' } } }, delete: { summary: 'Admin: delete post', responses: { '200': { description: 'OK' } } } },
  },
  'x-toolverse': { tools: toolSchemas },
} as const;
