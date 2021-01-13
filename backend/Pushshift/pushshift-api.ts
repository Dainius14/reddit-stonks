import axios from 'axios';
import {getUnixTime} from 'date-fns';

export class PushshiftAPI {

    private readonly _commentsEndpoint = 'https://api.pushshift.io/reddit/search/comment';
    private readonly _submissionsEndpoint = 'https://api.pushshift.io/reddit/search/submission';

    constructor() {
    }

    async getSubmissions(request: SubmissionsRequest): Promise<Submission[]> {
        return PushshiftAPI.doRequest<Submission>(this._submissionsEndpoint, request);
    }
    async getComments(request: CommentsRequest): Promise<Comment[]> {
        return PushshiftAPI.doRequest<Comment>(this._commentsEndpoint, request);
    }

    private static async doRequest<T>(endpoint: string, request: BaseRequest, retry: number = 0): Promise<T[]> {
        const params = PushshiftAPI.toUrlSearchParams(request);

        try {
            const response = await axios.get<PushshiftResponse<T>>(endpoint + '?' + params);
            return response.data.data;
        }
        catch (ex)
        {
            const e = ex as Error;
            console.error(e.message);
            if (retry < 3) {
                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), 1000)
                });
                console.log('Retrying request...');
                return this.doRequest(endpoint, request, retry + 1);
            }
        }
        return [];
    }

    private static toUrlSearchParams(obj: any) {
        const params = new URLSearchParams();
        for (const key of Object.keys(obj)) {
            const valueObj = obj[key];
            let value;
            if (Array.isArray(valueObj)) {
                value = (valueObj as []).join(',');
            }
            else if (valueObj instanceof Date) {
                value = getUnixTime(valueObj);
            }
            else {
                value = valueObj;
            }
            params.append(key, value);
        }
        return decodeURIComponent(params.toString());
    }
}

export interface PushshiftResponse<T> {
    data: T[];
}

export interface PushshiftApiOptions {

}

interface BaseRequest {
    fields?: string[],
    size?: number;
    subreddit?: string[];
    sort?: 'asc' | 'desc';
    sort_type?: 'score' | 'num_comments' | 'created_utc';
    before?: Date | number;
    after?: Date | number;
}

export interface SubmissionsRequest extends BaseRequest {
}

export interface CommentsRequest extends BaseRequest {
}

export interface Submission {
    all_awardings?: any[];
    allow_live_comments?: boolean;
    author?: string;
    author_flair_css_class?: any;
    author_flair_richtext?: any[];
    author_flair_text?: any;
    author_flair_type?: string;
    author_fullname?: string;
    author_patreon_flair?: boolean;
    author_premium?: boolean;
    awarders?: any[];
    can_mod_post?: boolean;
    contest_mode?: boolean;
    created_utc?: number;
    domain?: string;
    full_link?: string;
    gildings?: Gildings;
    id?: string;
    is_crosspostable?: boolean;
    is_meta?: boolean;
    is_original_content?: boolean;
    is_reddit_media_domain?: boolean;
    is_robot_indexable?: boolean;
    is_self?: boolean;
    is_video?: boolean;
    link_flair_background_color?: string;
    link_flair_richtext?: any[];
    link_flair_template_id?: string;
    link_flair_text?: string;
    link_flair_text_color?: string;
    link_flair_type?: string;
    locked?: boolean;
    media_only?: boolean;
    no_follow?: boolean;
    num_comments?: number;
    num_crossposts?: number;
    over_18?: boolean;
    parent_whitelist_status?: string;
    permalink?: string;
    pinned?: boolean;
    pwls?: number;
    removed_by_category?: string;
    retrieved_on?: number;
    score?: number;
    selftext?: string;
    send_replies?: boolean;
    spoiler?: boolean;
    stickied?: boolean;
    subreddit?: string;
    subreddit_id?: string;
    subreddit_subscribers?: number;
    subreddit_type?: string;
    thumbnail?: string;
    title?: string;
    total_awards_received?: number;
    treatment_tags?: any[];
    upvote_ratio?: number;
    url?: string;
    whitelist_status?: string;
    wls?: number;
}

export interface Comment {
    all_awardings: any[];
    associated_award: any;
    author: string;
    author_flair_background_color: any;
    author_flair_css_class: any;
    author_flair_richtext: any[];
    author_flair_template_id: any;
    author_flair_text: any;
    author_flair_text_color: any;
    author_flair_type: string;
    author_fullname: string;
    author_patreon_flair: boolean;
    author_premium: boolean;
    awarders: any[];
    body: string;
    collapsed_because_crowd_control: any;
    comment_type: any;
    created_utc: number;
    gildings: Gildings;
    id: string;
    is_submitter: boolean;
    link_id: string;
    locked: boolean;
    no_follow: boolean;
    parent_id: string;
    permalink: string;
    retrieved_on: number;
    score: number;
    send_replies: boolean;
    stickied: boolean;
    subreddit: string;
    subreddit_id: string;
    top_awarded_type: any;
    total_awards_received: number;
    treatment_tags: any[];
}


export interface Gildings {
}
