import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupTask } from './cleanup.task';
import { BackupTask } from './backup.task';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule],
  providers: [CleanupTask, BackupTask],
})
export class TasksModule {}
