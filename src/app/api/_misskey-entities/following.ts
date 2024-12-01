import { MiUser } from '@/app/api/_misskey-entities/user';

type MisskeyFollowing = {
  id: string;
  createdAt: string;
  followeeId: string;
  followerId: string;
  followee: MiUser;
};

export type MisskeyFollowingApiResponse = MisskeyFollowing[];
