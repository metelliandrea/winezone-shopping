import { SetMetadata } from '@nestjs/common';

export const UNPROTECTED = 'IS_PUBLIC_ROUTE';

export const Public = () => SetMetadata(UNPROTECTED, true);
