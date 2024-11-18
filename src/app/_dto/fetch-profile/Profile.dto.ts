export interface userProfileDto {
  handle: string;
  name: string[];
  questions: number;
  stopNewQuestion: boolean;
  stopAnonQuestion: boolean;
  stopNotiNewQuestion: boolean;
  stopPostAnswer: boolean;
  avatarUrl: string;
  questionBoxName: string;
}
