/**
 * AgentBoxes Session & Authentication Manager
 * Issues single-use connection tickets and validates tenant-isolated session tokens.
 */

import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export interface SessionRecord {
  token: string;
  tenantId: string;
  boxId?: string;
  createdAt: number;
  expiresAt: number;
}

export class SessionManager {
  private readonly tickets = new Map<string, { tenantId: string; boxId: string; expiresAt: number }>();
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(private readonly ttlMs = 24 * 60 * 60 * 1000) {
    // Cleanup expired sessions every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [k, v] of this.tickets.entries()) {
      if (v.expiresAt <= now) this.tickets.delete(k);
    }
    for (const [k, v] of this.sessions.entries()) {
      if (v.expiresAt <= now) this.sessions.delete(k);
    }
  }

  /**
   * Issues a short-lived one-time ticket to connect to a box display.
   */
  issueTicket(tenantId: string, boxId: string, ttlMs = 60 * 1000): string {
    const ticket = crypto.randomBytes(32).toString('hex');
    this.tickets.set(ticket, {
      tenantId,
      boxId,
      expiresAt: Date.now() + ttlMs
    });
    return ticket;
  }

  /**
   * Exchanges a one-time ticket for a persistent session cookie.
   */
  exchangeTicket(ticket: string): { token: string; cookieHeader: string; tenantId: string; boxId: string } {
    const record = this.tickets.get(ticket);
    if (!record || record.expiresAt <= Date.now()) {
      this.tickets.delete(ticket);
      throw new Error('Invalid or expired connection ticket.');
    }
    this.tickets.delete(ticket);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.ttlMs;

    this.sessions.set(token, {
      token,
      tenantId: record.tenantId,
      boxId: record.boxId,
      createdAt: Date.now(),
      expiresAt
    });

    const cookieHeader = `agentbox_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(this.ttlMs / 1000)}`;
    return { token, cookieHeader, tenantId: record.tenantId, boxId: record.boxId };
  }

  /**
   * Direct issuance for API authentication / local sessions.
   */
  createSession(tenantId: string, boxId?: string): { token: string; cookieHeader: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.ttlMs;

    this.sessions.set(token, {
      token,
      tenantId,
      boxId,
      createdAt: Date.now(),
      expiresAt
    });

    const cookieHeader = `agentbox_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(this.ttlMs / 1000)}`;
    return { token, cookieHeader };
  }

  /**
   * Validates an incoming HTTP request or WebSocket upgrade.
   */
  authenticate(req: IncomingMessage): { tenantId: string; boxId?: string } | null {
    // 1. Check Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const session = this.sessions.get(token);
      if (session && session.expiresAt > Date.now()) {
        return { tenantId: session.tenantId, boxId: session.boxId };
      }
    }

    // 2. Check Cookie
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/agentbox_session=([a-f0-9]{64})/);
      if (match) {
        const token = match[1];
        const session = this.sessions.get(token);
        if (session && session.expiresAt > Date.now()) {
          return { tenantId: session.tenantId, boxId: session.boxId };
        }
      }
    }

    return null;
  }

  /**
   * Verifies that the tenant has authorization to access the target box.
   */
  authorizeBox(req: IncomingMessage, targetBoxId: string, boxTenantId?: string): boolean {
    const auth = this.authenticate(req);
    if (!auth) return false;
    // If ticket was scoped to a specific box
    if (auth.boxId && auth.boxId !== targetBoxId) return false;
    // If box belongs to a tenant, ensure matching tenant
    if (boxTenantId && auth.tenantId !== boxTenantId && auth.tenantId !== 'admin') return false;
    return true;
  }
}
