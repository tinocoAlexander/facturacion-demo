import { Inject } from '@nestjs/common';

export const DATABASE_POOL = 'DATABASE_POOL';
export const InjectPool = () => Inject(DATABASE_POOL);
