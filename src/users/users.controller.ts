import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string | number) {
    return this.usersService.findOne(this.parseId(id));
  }

  @Patch(':id')
  update(@Param('id') id: string | number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(this.parseId(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string | number) {
    return this.usersService.remove(this.parseId(id));
  }

  private parseId(id: string | number): number {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException('User id must be a positive integer');
    }

    return parsedId;
  }
}
