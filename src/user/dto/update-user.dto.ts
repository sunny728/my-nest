export class UpdateUserDto {
  name?: string;
  age?: number;
  email?: string;
  password?: string;
  roles?: 'admin' | 'user';
}
