import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

const http = httpRouter();

function validateAuth(request: Request, expectedToken: string | undefined): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !expectedToken) {
    return false;
  }
  return authHeader === `Bearer ${expectedToken}`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

// POST /api/agent/event
http.route({
  path: '/api/agent/event',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.agentEvents.emit, body);
    return jsonResponse({ id });
  }),
});

// POST /api/agent/contradiction
http.route({
  path: '/api/agent/contradiction',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.contradictions.add, body);
    return jsonResponse({ id });
  }),
});

// POST /api/agent/exploration
http.route({
  path: '/api/agent/exploration',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.explorations.upsert, body);
    return jsonResponse({ id });
  }),
});

// POST /api/agent/knowledge/node
http.route({
  path: '/api/agent/knowledge/node',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.knowledge.createNode, body);
    return jsonResponse({ id });
  }),
});

// POST /api/agent/knowledge/entry
http.route({
  path: '/api/agent/knowledge/entry',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.knowledge.createEntry, body);
    return jsonResponse({ id });
  }),
});

// POST /api/agent/forum/create
http.route({
  path: '/api/agent/forum/create',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.forum.create, body);
    return jsonResponse({ id });
  }),
});

// POST /api/agent/forum/search
http.route({
  path: '/api/agent/forum/search',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const results = await ctx.runQuery(internal.forum.search, body);
    return jsonResponse({ results });
  }),
});

// POST /api/agent/questionnaire/create
http.route({
  path: '/api/agent/questionnaire/create',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.questionnaires.create, body);
    return jsonResponse({ id });
  }),
});

// GET /api/agent/data-sources?clientId=xxx
http.route({
  path: '/api/agent/data-sources',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    if (!clientId) {
      return errorResponse('Missing clientId query parameter', 400);
    }
    const dataSources = await ctx.runQuery(internal.dataSources.internalListByClient, {
      clientId: clientId as Id<'clients'>,
    });
    return jsonResponse({ dataSources });
  }),
});

// GET /api/agent/questionnaire/responses?questionnaireId=xxx
http.route({
  path: '/api/agent/questionnaire/responses',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const url = new URL(request.url);
    const questionnaireId = url.searchParams.get('questionnaireId');
    if (!questionnaireId) {
      return errorResponse('Missing questionnaireId query parameter', 400);
    }
    const responses = await ctx.runQuery(internal.questionnaires.internalGetResponses, {
      questionnaireId: questionnaireId as Id<'questionnaires'>,
    });
    return jsonResponse({ responses });
  }),
});

// GET /api/agent/pipeline?clientId=xxx
http.route({
  path: '/api/agent/pipeline',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    if (!clientId) {
      return errorResponse('Missing clientId query parameter', 400);
    }
    const result = await ctx.runQuery(internal.pipeline.get, { clientId: clientId as Id<'clients'> });
    return jsonResponse({ result });
  }),
});

// POST /api/agent/pipeline/update
http.route({
  path: '/api/agent/pipeline/update',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.AGENT_AUTH_TOKEN;
    if (!validateAuth(request, token)) {
      return errorResponse('Unauthorized', 401);
    }
    const body = await request.json();
    const id = await ctx.runMutation(internal.pipeline.update, body);
    return jsonResponse({ id });
  }),
});

export default http;
