export interface FetchAllAnswersDto {
    sinceId?: string;
    untilId?: string;
    sort?: 'ASC' | 'DESC'
    limit?: number;
}