import { createContext } from 'react';
import { userProfileMeDto } from '../_dto/fetch-profile/Profile.dto';

export const UserProfileContext = createContext<userProfileMeDto | undefined>(undefined);

const ProfileUpdateReqEvent = 'ProfileUpdateReqEvent';
type ProfileUpdateReqEvent = typeof ProfileUpdateReqEvent;
type ProfileUpdateReqData = Partial<userProfileMeDto>;

/**
 * UserProfileContext 의 Update요청 Event들
 */
export class MyProfileEv {
  private constructor() {}
  static async SendUpdateReq(data: Partial<userProfileMeDto>) {
    const ev = new CustomEvent<ProfileUpdateReqData>(ProfileUpdateReqEvent, { bubbles: true, detail: data });
    window.dispatchEvent(ev);
    console.log('Send My Profile Update Request Event...');
  }

  static addEventListener(onEvent: (ev: CustomEvent<ProfileUpdateReqData>) => void) {
    console.log('Add Profile Update Req EventListener');
    window.addEventListener(ProfileUpdateReqEvent, onEvent as EventListener);
  }

  static removeEventListener(onEvent: (ev: CustomEvent<ProfileUpdateReqData>) => void) {
    console.log('Remove Profile Update Req EventListener');
    window.removeEventListener(ProfileUpdateReqEvent, onEvent as EventListener);
  }
}
