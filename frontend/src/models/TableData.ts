export interface TickerWithSubmissionIdsForEachDay {
    ticker: string;
    tickerName: string;
    days: DayWithSubreddits[];
    submissionCount: number;
}

export interface DayWithSubreddits {
    date: string;
    subreddits: SubredditWithSubmissionIds[];
    change: number;
    isChangeFinite: boolean;
    submissionCount: number;
}

export interface SubredditWithSubmissionIds {
    subreddit: string;
    submissionCount: number;
    change: number;
    isChangeFinite: boolean;
}
