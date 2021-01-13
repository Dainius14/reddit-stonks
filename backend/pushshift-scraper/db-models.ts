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
