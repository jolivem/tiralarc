import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { SELF_ASSIGNABLE_ROLES, type SelfAssignableRole } from '../../auth/dto/auth.dto.js';
import { AuthProvider, Role } from '../../generated/prisma/client.js';

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ type: String, nullable: true })
  displayName!: string | null;

  @ApiProperty({ example: 'fr' })
  locale!: string;

  @ApiProperty({
    enum: Role,
    enumName: 'Role',
    isArray: true,
    description:
      'Empty for an account created through Google / Apple whose user has not chosen yet.',
  })
  roles!: Role[];

  @ApiProperty({ description: 'False for accounts created through Google / Apple only.' })
  hasPassword!: boolean;

  @ApiProperty({ enum: AuthProvider, enumName: 'AuthProvider', isArray: true })
  providers!: AuthProvider[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class UpdateMyRolesDto {
  @ApiProperty({
    enum: SELF_ASSIGNABLE_ROLES,
    enumName: 'SelfAssignableRole',
    isArray: true,
    minItems: 1,
    description: 'Replaces the self-assignable roles (ADMIN, if held, is kept).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @ArrayMaxSize(SELF_ASSIGNABLE_ROLES.length)
  @IsIn(SELF_ASSIGNABLE_ROLES, { each: true })
  roles!: SelfAssignableRole[];
}
