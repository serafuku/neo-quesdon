export type User = {
  id: string;
  username: string;
  name: string | null;
  url?: string | null;
  avatarUrl: string | null;
  avatarColor: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  bannerUrl?: string | null;
  bannerColor?: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  emojis: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  host: string | null;
  description?: string | null;
  birthday?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  location?: string | null;
  followersCount?: number;
  followingCount?: number;
  notesCount?: number;
  isBot?: boolean;
  pinnedNoteIds?: Array<string>;
  //pinnedNotes?: Array<Note>;
  isCat?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
  isLocked?: boolean;
  hasUnreadSpecifiedNotes?: boolean;
  hasUnreadMentions?: boolean;
};
