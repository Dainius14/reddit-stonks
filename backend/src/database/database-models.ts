export interface DBSubmission {
    submission_id: string;
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
    is_fake: 1 | 0;
    name?: string;
    exchange?: string;
    currency?: string;
    industry?: string;
    sector?: string;
    website?: string;
}

export interface DBSubmissionHasTicker {
    id: number;
    submission_id: string;
    ticker: string;
}
