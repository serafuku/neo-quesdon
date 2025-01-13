/* eslint-disable @typescript-eslint/no-explicit-any */
import { AccountDeleteService } from "@/app/api/_service/account/account-delete.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const deleteService = AccountDeleteService.getInstance();
  return await deleteService.deleteAccountApi(req, null as any, null as any);
}