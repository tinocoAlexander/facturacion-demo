import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../audit/audit.service';
import { ChangePasswordDto, ResponseUserDto, UpdateProfileDto } from '../dtos';
import { UsersRepository } from '../users.repository';
import { mapToResponseUserDto } from '../users.mapper';

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
      throw new BadRequestException('ID inválido');
    }

    const updated = await this.usersRepository.updateProfile(
      userId,
      dto.fullName,
    );
    if (!updated) throw new NotFoundException('Usuario no encontrado');

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
      throw new BadRequestException('ID inválido');
    }

    const publicUser = await this.usersRepository.findById(userId);
    if (!publicUser) throw new NotFoundException('Usuario no encontrado');

    const user = await this.usersRepository.findByEmail(publicUser.email);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const currentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );
    if (!currentValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS);
    const changed = await this.usersRepository.changePassword(userId, newHash);
    if (!changed) throw new NotFoundException('Usuario no encontrado');

    await this.audit.log('USER_CHANGE_PASSWORD', {
      actorUserId: userId,
      targetUserId: userId,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
