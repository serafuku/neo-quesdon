import { NextRequest } from 'next/server';
import { UserSettingsService } from './_service';

const uss = UserSettingsService.get();

export async function GET(req: NextRequest) {
  return await uss.getSettings(req);
}

export async function POST(req: NextRequest) {
  return await uss.updateSettings(req);
}
