import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { RequestWithUser } from './user-context';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user;
});
