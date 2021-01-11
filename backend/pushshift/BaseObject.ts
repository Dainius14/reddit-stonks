export interface BaseRequestParameters {
    sort: "asc" | "desc";
    sort_type: "score" | "num_comments" | "created_utc";
    after: number|string;
    before: number|string;
    after_id: number;
    before_id: number;
    created_utc: number;
    score: number;
    gilded: number;
    edited: boolean;
    author: Keyword;
    subreddit: string;
    distinguished: Keyword;
    retrieved_on: number;
    last_updated: number;
    q: string;
    id: number;
    metadata: boolean;
    unique: Filter;
    pretty: Filter;
    html_decode: Filter;
    permalink: Keyword;
    user_removed: boolean;
    mod_removed: boolean;
    subreddit_type: keyword;
    author_flair_css_class: keyword;
    author_flair_text: keyword;
}