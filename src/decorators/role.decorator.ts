import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES = 'REQUIRED_ROLES';

export const RequiredRoles = (...role: Roles[]) =>
  SetMetadata(REQUIRED_ROLES, role);

export enum Roles {
  ADMIN = 'ADMIN',
  PREMIUM = 'PREMIUM',
  STANDARD = 'STANDARD',
}
