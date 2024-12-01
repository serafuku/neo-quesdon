import { createContext } from 'react';
import { userProfileMeDto } from '@/app//_dto/fetch-profile/Profile.dto';
import { Logger } from '@/utils/logger/Logger';

export const MyProfileContext = createContext<userProfileMeDto | undefined>(undefined);

const ProfileUpdateReqEvent = 'ProfileUpdateReqEvent';
type ProfileUpdateReqEvent = typeof ProfileUpdateReqEvent;
type ProfileUpdateReqData = Partial<userProfileMeDto>;

/**
 * MyProfileContext 의 Update요청 Event들
 */
export class MyProfileEv {
  private constructor() {}
  private static logger = new Logger('UpdateMyProfileContext', {noColor: true});
  static async SendUpdateReq(data: Partial<userProfileMeDto>) {
    const ev = new CustomEvent<ProfileUpdateReqData>(ProfileUpdateReqEvent, { bubbles: true, detail: data });
    window.dispatchEvent(ev);
    MyProfileEv.logger.debug('Send My Profile Update Request Event...');
  }

  static addEventListener(onEvent: (ev: CustomEvent<ProfileUpdateReqData>) => void) {
    MyProfileEv.logger.debug('add Profile Update EventListener');
    window.addEventListener(ProfileUpdateReqEvent, onEvent as EventListener);
  }

  static removeEventListener(onEvent: (ev: CustomEvent<ProfileUpdateReqData>) => void) {
    MyProfileEv.logger.debug('Remove Profile Update Req EventListener');
    window.removeEventListener(ProfileUpdateReqEvent, onEvent as EventListener);
  }
}
