import Link from 'next/link';
import { userProfileDto } from '../_dto/fetch-profile/Profile.dto';
import NameComponents from './NameComponents';

interface Props {
  profile: userProfileDto;
}

export default function UsernameAndProfile({ profile }: Props) {
  return (
    <div className="backdrop-brightness-110 dark:backdrop-brightness-90 rounded-box border-base-300 p-4 dark:text-white">
      <Link href={`/main/user/${profile.handle}`} className="flex items-center gap-4">
        <img src={profile.avatarUrl} alt="following avatar" className="w-14 h-14 rounded-full object-cover" />
        <div className="flex flex-col text-md">
          <NameComponents username={profile.name} width={16} height={16} />
          <span className="text-xs">{profile.handle}</span>
        </div>
      </Link>
    </div>
  );
}
