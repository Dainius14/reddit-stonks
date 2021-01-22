import {MainDataResponseDTO, StockDataResponseDTO, SubmissionDTO} from '../../backend/src/models/dto';

export class RedditStonksApi {

    static async getMainData(days: number): Promise<MainDataResponseDTO> {
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

    static async getStockData(tickers: string[]): Promise<StockDataResponseDTO> {
        return await this.betterFetch(`/api/stocks/${tickers.join(',')}`, {
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

    private static unescapeEscapedCommas(str: string) {
        return str.replaceAll('%2C', ',');
    }
}

export class RequestError extends Error {
    public readonly response: Response;

    constructor(msg: string, response: Response) {
        super(msg);
        this.response = response;
    }
}
