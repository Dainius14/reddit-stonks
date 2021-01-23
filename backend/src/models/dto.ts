export interface MainDataResponseDTO {
    data: TickerWithSubmissionIdsForEachDayDTO[];
    lastSubmissionTime: string;
    submissionsUpdated: string;
    daysDesc: string[]
}

export interface TickerWithSubmissionIdsForEachDayDTO {
    ticker: string;
    tickerName: string;
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
    latestPrice: number;
    change: number;
    changePercent: number;
    low: number;
    high: number;
    open: number;
    close: number;
    currency: string;
}


export interface NewsResponseDTO extends Array<NewsDTO> {
}

export interface NewsDTO {
    datetime: number;
    headline: string;
    source: string;
    url: string;
}
