import { createContext } from "react";
import { userProfileMeDto } from "../_dto/fetch-profile/Profile.dto";

export const UserProfileContext = createContext<userProfileMeDto | undefined>(undefined);