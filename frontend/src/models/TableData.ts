export interface TickerWithSubmissionIdsForEachDayDTO {
    ticker: string;
    stockData?: StockDataDTO;
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



export interface TickerWithSubmissionIdsForEachDay {
    ticker: string;
    stockData?: StockDataDTO;
    days: DayWithSubreddits[];
}

export interface DayWithSubreddits {
    date: string;
    subreddits: SubredditWithSubmissionIds[];
    change: number;
    isChangeFinite: boolean;
}

export interface SubredditWithSubmissionIds {
    subreddit: string;
    submissionIds: string[];
    change: number;
    isChangeFinite: boolean;
}
