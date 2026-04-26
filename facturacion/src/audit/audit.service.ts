import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { AUDIT_QUERIES } from '../database/queries/audit.queries';

export type AuditContext = {
  actorUserId?: number | null;
  targetUserId?: number | null;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export type AuditLogRecord = {
  id: number;
  actorUserId: number | null;
  action: string;
  targetUserId: number | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AuditLogRow = {
  id: number;
  actor_user_id: number | null;
  action: string;
  target_user_id: number | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectPool() private readonly pool: Pool) {}

  async log(action: string, ctx: AuditContext = {}) {
    try {
      await this.pool.query(AUDIT_QUERIES.INSERT, [
        ctx.actorUserId ?? null,
        action,
        ctx.targetUserId ?? null,
        ctx.ip ?? null,
        ctx.userAgent ?? null,
        ctx.metadata ?? null,
      ]);
    } catch (err) {
      // Audit nunca debería tumbar el request, pero sí dejar rastro en logs
      this.logger.error(`audit log failed: ${action}`, (err as Error).message);
      return;
    }
  }

  async list(params: {
    page?: number;
    limit?: number;
    action?: string;
    actorUserId?: number;
    targetUserId?: number;
    from?: string;
    to?: string;
  }): Promise<{
    data: AuditLogRecord[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const safePage = Math.max(1, params.page ?? 1);
    const safeLimit = Math.min(200, Math.max(1, params.limit ?? 50));
    const offset = (safePage - 1) * safeLimit;

    const where: string[] = [];
    const values: unknown[] = [];

    const push = (clause: string, value: unknown) => {
      values.push(value);
      where.push(clause.replace('?', `$${values.length}`));
    };

    if (params.action) push('action = ?', params.action);
    if (Number.isInteger(params.actorUserId))
      push('actor_user_id = ?', params.actorUserId);
    if (Number.isInteger(params.targetUserId))
      push('target_user_id = ?', params.targetUserId);

    if (params.from) {
      const d = new Date(params.from);
      if (!Number.isNaN(d.getTime())) push('created_at >= ?', d.toISOString());
    }
    if (params.to) {
      const d = new Date(params.to);
      if (!Number.isNaN(d.getTime())) push('created_at <= ?', d.toISOString());
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await this.pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM audit_logs ${whereSql}`,
      values,
    );
    const total = countRes.rows?.[0]?.total ?? 0;

    const listValues = [...values, safeLimit, offset];
    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;

    const rowsRes = await this.pool.query<AuditLogRow>(
      `
        SELECT id, actor_user_id, action, target_user_id, ip, user_agent, metadata, created_at
        FROM audit_logs
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      listValues,
    );

    const data: AuditLogRecord[] = (rowsRes.rows ?? []).map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id ?? null,
      action: r.action,
      targetUserId: r.target_user_id ?? null,
      ip: r.ip ?? null,
      userAgent: r.user_agent ?? null,
      metadata: r.metadata ?? null,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }
}
