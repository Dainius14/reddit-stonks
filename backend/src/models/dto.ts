export interface MainDataResponseDTO {
    data: TickerWithSubmissionIdsForEachDayDTO[];
    lastSubmissionTime: string;
    daysDesc: string[]
}

export interface TickerWithSubmissionIdsForEachDayDTO {
    ticker: string;
    days: DayWithSubredditsDTO[];
}

export interface DayWithSubredditsDTO {
    date: string;
    subreddits: SubredditWithSubmissionIdsDTO[];
}

export interface SubredditWithSubmissionIdsDTO {
    subreddit: string;
    submissionIds: string[];
}

export interface SubmissionsResponseDTO {
    [_: string]: SubmissionDTO;
}

export interface SubmissionDTO {
    id: string;
    subreddit: string;
    title: string;
    created_utc: number;
    score: number;
    url: string;
    is_removed: boolean;
    author: string;
}

export interface StockDataResponseDTO {
    [_: string]: StockDataDTO | null;
}

export interface StockDataDTO {
    companyName: string;
    latestPrice: number;
    change: number;
    changePercent: number;
    low: number;
    high: number;
    open: number;
    close: number;
}
