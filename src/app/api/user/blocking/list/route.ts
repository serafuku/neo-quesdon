import { NextRequest } from "next/server";
import { BlockingService } from "../_service";

export async function POST(req: NextRequest) {
  const service = BlockingService.get();
  return await service.getBlockList(req);
}