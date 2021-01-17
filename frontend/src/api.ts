import {TickerWithSubmissionIdsForEachDayDTO} from './models/TableData';
import {SubmissionDTO} from './pages/IndexPage';

export class RedditStonksApi {

    static async getMainData(days: number): Promise<MainDataResponse> {
        const params = new URLSearchParams({
            days: days.toString()
        });
        return await this.betterFetch(`/api/data?${params.toString()}`, {
            method: 'GET'
        });
    }

    static async getAvailableSubreddits(): Promise<string[]> {
        return await this.betterFetch('/api/data/subreddits', {
            method: 'GET'
        });
    }

    static async getSubmissions(days: number): Promise<Record<string, SubmissionDTO>> {
        const params = new URLSearchParams({
            days: days.toString()
        });
        return await this.betterFetch(`/api/data/submissions?${params.toString()}`, {
            method: 'GET'
        });
    }


    private static async betterFetch(input: string, init: RequestInit): Promise<any> {
        const response = await fetch(input, init);
        if (response.ok) {
            return response.json();
        }
        else {
            throw new RequestError(`${response.status} ${response.statusText}`, response);
        }
    }
}

export class RequestError extends Error {
    public readonly response: Response;

    constructor(msg: string, response: Response) {
        super(msg);
        this.response = response;
    }
}

interface MainDataResponse {
    data: TickerWithSubmissionIdsForEachDayDTO[];
    updatedAt: string;
    daysDesc: string[]
}
