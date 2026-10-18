import { ApiProperty } from '@nestjs/swagger';
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
      "Nobody picks their roles: every account is ARCHER; COACH while an archer's coach " +
      'invitation the user accepted still exists; ADMIN is granted by an administrator.',
  })
  roles!: Role[];

  @ApiProperty({ description: 'False for accounts created through Google / Apple only.' })
  hasPassword!: boolean;

  @ApiProperty({ enum: AuthProvider, enumName: 'AuthProvider', isArray: true })
  providers!: AuthProvider[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
