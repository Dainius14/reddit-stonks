export interface DBSubmission {
    id: string;
    subreddit: string;
    title: string;
    selftext?: string;
    created_utc: number;
    score: number;
    author: string;
    url: string;
}

export interface DBTicker {
    ticker: string;
}

export interface DBSubmissionHasTicker {
    id: number;
    submission_id: string;
    ticker: string;
}
