export interface FetchUserAnswersDto {
    sinceId?: string;
    untilId?: string;
    sort?: 'ASC' | 'DESC'
    limit?: number;
    answeredPersonHandle: string;
}