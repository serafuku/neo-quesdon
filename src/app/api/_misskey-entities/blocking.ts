import { MiUser } from '@/app/api/_misskey-entities/user';

type MiBlock = {
  id: string;
  createdAt: string;
  blockeeId: MiUser['id'];
  blockee: MiUser;
};
export type MisskeyBlockingApiResponse = MiBlock[];
