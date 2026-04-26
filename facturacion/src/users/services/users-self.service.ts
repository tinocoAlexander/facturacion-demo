import { Injectable, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../audit/audit.service';
import { ChangePasswordDto, ResponseUserDto, UpdateProfileDto } from '../dtos';
import { UsersRepository } from '../users.repository';
import { mapToResponseUserDto } from '../users.mapper';
import { httpError } from '../../common/errors/http-error';

@Injectable()
export class UsersSelfService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<ResponseUserDto> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'USERS_INVALID_ID',
        'ID inválido',
      );
    }

    const updated = await this.usersRepository.updateProfile(
      userId,
      dto.fullName,
    );
    if (!updated)
      throw httpError(
        HttpStatus.NOT_FOUND,
        'USERS_NOT_FOUND',
        'Usuario no encontrado',
      );

    await this.audit.log('USER_UPDATE_PROFILE', {
      actorUserId: userId,
      targetUserId: userId,
    });

    return mapToResponseUserDto(updated);
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'USERS_INVALID_ID',
        'ID inválido',
      );
    }

    const publicUser = await this.usersRepository.findById(userId);
    if (!publicUser)
      throw httpError(
        HttpStatus.NOT_FOUND,
        'USERS_NOT_FOUND',
        'Usuario no encontrado',
      );

    const user = await this.usersRepository.findByEmail(publicUser.email);
    if (!user)
      throw httpError(
        HttpStatus.NOT_FOUND,
        'USERS_NOT_FOUND',
        'Usuario no encontrado',
      );

    const currentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );
    if (!currentValid) {
      throw httpError(
        HttpStatus.UNAUTHORIZED,
        'USERS_INVALID_CURRENT_PASSWORD',
        'La contraseña actual es incorrecta',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'USERS_PASSWORD_SAME_AS_CURRENT',
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS);
    const changed = await this.usersRepository.changePassword(userId, newHash);
    if (!changed)
      throw httpError(
        HttpStatus.NOT_FOUND,
        'USERS_NOT_FOUND',
        'Usuario no encontrado',
      );

    await this.audit.log('USER_CHANGE_PASSWORD', {
      actorUserId: userId,
      targetUserId: userId,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
