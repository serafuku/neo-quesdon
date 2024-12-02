import { NextRequest } from 'next/server';
import { ProfileService } from '@/app/api/db/_profile-service/profile-service';

export async function GET(req: NextRequest) {
  const service = ProfileService.get();
  return await service.fetchProfile(req, true);
}
