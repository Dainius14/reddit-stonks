import {MainDataResponseDTO, StockDataResponseDTO, SubmissionDTO} from '../../backend/src/models/dto';
import {formatISO} from 'date-fns';

export class RedditStonksApi {

    static async getMainData(from: Date, to: Date): Promise<MainDataResponseDTO> {
        const params = new URLSearchParams({
            from: formatISO(from, {representation: 'date'}),
            to: formatISO(to, {representation: 'date'}),
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

    static async getSubmissions(ticker: string, from: Date, to: Date, limit: number, skip: number, sortBy: string, order: 'asc' | 'desc', subreddits: string[]): Promise<SubmissionDTO[]> {
        const params = new URLSearchParams({ ticker, limit, skip, sortBy, order, subreddits,
            from: formatISO(from, {representation: 'date'}),
            to: formatISO(to, {representation: 'date'}),
        } as any);
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

    public static async getNews(ticker: string) {
        return await this.betterFetch(`/api/stocks/${ticker}/news`, {
            method: 'GET'
        });
    }
}

export class RequestError extends Error {
    public readonly response: Response;

    constructor(msg: string, response: Response) {
        super(msg);
        this.response = response;
    }
}
