import { LogoutAllService } from '@/app/api/_service/login/logout-all-service';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const service = LogoutAllService.getInstance();
  return await service.logoutAll(req);
}
