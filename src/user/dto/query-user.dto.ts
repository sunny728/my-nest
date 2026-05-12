export class QueryUserDto {
  page?: string;
  pageSize?: string;
  name?: string;
  roles?: 'admin' | 'user';
}
