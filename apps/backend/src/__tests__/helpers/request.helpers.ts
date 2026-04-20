import request from 'supertest';
import type { Test } from 'supertest';
import { Application } from 'express';
import app from '../../index';

// ─── Authenticated Request Factory ───────────────────────────────────────────

export interface AuthenticatedRequestFactory {
  get(url: string): Test;
  post(url: string): Test;
  put(url: string): Test;
  patch(url: string): Test;
  delete(url: string): Test;
  accessToken: string;
}

/**
 * Creates an authenticated supertest request factory for a given user.
 * Logs in the user and attaches the access token to all subsequent requests.
 *
 * @param credentials - Email and password of the user to authenticate as
 * @param appInstance - Express app instance (defaults to the main app)
 */
export async function createAuthenticatedRequest(
  credentials: { email: string; password: string },
  appInstance: Application = app
): Promise<AuthenticatedRequestFactory> {
  // Perform login to get access token
  const loginResponse = await request(appInstance)
    .post('/api/v1/auth/login')
    .send(credentials)
    .expect(200);

  const { accessToken } = loginResponse.body.data;

  if (!accessToken) {
    throw new Error(
      `Failed to authenticate as ${credentials.email}. Login response: ${JSON.stringify(loginResponse.body)}`
    );
  }

  const agent = request(appInstance);

  return {
    accessToken,

    get(url: string): Test {
      return agent.get(url).set('Authorization', `Bearer ${accessToken}`);
    },

    post(url: string): Test {
      return agent.post(url).set('Authorization', `Bearer ${accessToken}`);
    },

    put(url: string): Test {
      return agent.put(url).set('Authorization', `Bearer ${accessToken}`);
    },

    patch(url: string): Test {
      return agent.patch(url).set('Authorization', `Bearer ${accessToken}`);
    },

    delete(url: string): Test {
      return agent.delete(url).set('Authorization', `Bearer ${accessToken}`);
    },
  };
}

/**
 * Creates an unauthenticated supertest agent for the app.
 */
export function createRequest(appInstance: Application = app) {
  return request(appInstance);
}

/**
 * Creates an admin-authenticated request factory using the default test admin credentials.
 */
export async function createAdminRequest(
  _prisma?: unknown,
  appInstance: Application = app
): Promise<AuthenticatedRequestFactory> {
  return createAuthenticatedRequest(
    {
      email: 'admin@test.getidfix.com',
      password: 'Admin@123456',
    },
    appInstance
  );
}

/**
 * Creates a user-authenticated request factory using the default test user credentials.
 */
export async function createUserRequest(
  _prisma?: unknown,
  appInstance: Application = app
): Promise<AuthenticatedRequestFactory> {
  return createAuthenticatedRequest(
    {
      email: 'user@test.getidfix.com',
      password: 'User@123456',
    },
    appInstance
  );
}

// ─── Response Assertion Helpers ───────────────────────────────────────────────

/**
 * Asserts that a response has the standard success shape:
 * { status: 'success', data: { ... } }
 */
export function expectSuccess(body: Record<string, unknown>): void {
  expect(body).toHaveProperty('status', 'success');
  expect(body).toHaveProperty('data');
}

/**
 * Asserts that a response has the standard error shape:
 * { error: { code, message } }
 */
export function expectError(
  body: Record<string, unknown>,
  code?: string
): void {
  expect(body).toHaveProperty('error');
  expect(body.error).toHaveProperty('code');
  expect(body.error).toHaveProperty('message');

  if (code) {
    expect((body.error as Record<string, unknown>).code).toBe(code);
  }
}

/**
 * Asserts that a paginated response has the correct shape:
 * { status: 'success', data: { items: [...], total, page, pageSize } }
 */
export function expectPaginatedResponse(
  body: Record<string, unknown>,
  expectedPage: number,
  expectedPageSize: number
): void {
  expectSuccess(body);
  const data = body.data as Record<string, unknown>;
  expect(data).toHaveProperty('items');
  expect(Array.isArray(data.items)).toBe(true);
  expect(data).toHaveProperty('total');
  expect(data).toHaveProperty('page', expectedPage);
  expect(data).toHaveProperty('pageSize', expectedPageSize);
}
