/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { UserSettingsService } from '@/app/api/_service/user-settings/user-settings-service';

const uss = UserSettingsService.get();

export async function GET(req: NextRequest) {
  return await uss.getSettings(req);
}

export async function POST(req: NextRequest) {
  return await uss.updateSettings(req, {} as any, {} as any);
}
