export interface TickerWithSubmissionIdsForEachDay {
    ticker: string;
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
