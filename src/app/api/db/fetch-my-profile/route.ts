import { NextRequest } from 'next/server';
import { ProfileService } from '@/app/api/_service/profile/profile-service';

export async function GET(req: NextRequest) {
  const service = ProfileService.get();
  return await service.fetchProfile(req, true);
}
