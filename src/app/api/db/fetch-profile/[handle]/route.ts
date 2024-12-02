import { ProfileService } from '@/app/api/db/_profile-service/profile-service';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ handle?: string }> }) {
  const userHandle = (await params).handle;
  const service = ProfileService.get();
  return await service.fetchProfile(req, false, userHandle);
}
