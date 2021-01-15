import axios from 'axios';

export class IexCloudApi {
    constructor(private _config: IEXCloudConfig) {
    }

    async getQuote(ticker: string): Promise<Quote | null> {
        return await this.doRequest<Quote | null>(`/stock/${ticker}/quote`);
    }

    async getQuotes(tickers: string[]): Promise<Map<string, Quote>> {
        const params = new URLSearchParams({
            types: 'quote',
            symbols: tickers.join(',')
        });
        const response = await this.doRequest<Record<string, {quote: Quote}> | undefined>(`/stock/market/batch`, params);

        return tickers.reduce((result, ticker) => {
            if (response && response[ticker]?.quote) {
                result.set(ticker, response[ticker].quote);
            }
            return result;
        }, new Map<string, Quote>());
    }

    private async doRequest<T>(path: string, params?: URLSearchParams): Promise<T | null> {
        if (params) {
            params.set('token', this._config.token);
        }
        else {
            params = new URLSearchParams({
                token: this._config.token
            });
        }
        const url = this.createUrl(path, params);

        try {
            const response = await axios.get<T>(url);
            return response.data;
        }
        catch (ex)
        {
            const e = ex as Error;
            console.error(e.message);
            return null;
        }
    }

    private createUrl(path: string, params: URLSearchParams) {
        const paramsWithoutEncodedComma = params.toString().replace(/%20/g, ',');
        return `${this._config.hostname}/stable${path}?${paramsWithoutEncodedComma}`;
    }
}

interface IEXCloudConfig {
    hostname: string;
    token: string;
}


export interface Quote {
    symbol: string;
    companyName: string;
    primaryExchange: string;
    calculationPrice: string;
    open: number;
    openTime: number;
    openSource: string;
    close: number;
    closeTime: number;
    closeSource: string;
    high: number;
    highTime: number;
    highSource: string;
    low: number;
    lowTime: number;
    lowSource: string;
    latestPrice: number;
    latestSource: string;
    latestTime: string;
    latestUpdate: number;
    latestVolume: number;
    iexRealtimePrice: number;
    iexRealtimeSize: number;
    iexLastUpdated: number;
    delayedPrice: number;
    delayedPriceTime: number;
    oddLotDelayedPrice: number;
    oddLotDelayedPriceTime: number;
    extendedPrice: number;
    extendedChange: number;
    extendedChangePercent: number;
    extendedPriceTime: number;
    previousClose: number;
    previousVolume: number;
    change: number;
    changePercent: number;
    volume: number;
    iexMarketPercent: number;
    iexVolume: number;
    avgTotalVolume: number;
    iexBidPrice: number;
    iexBidSize: number;
    iexAskPrice: number;
    iexAskSize: number;
    iexOpen: number;
    iexOpenTime: number;
    iexClose: number;
    iexCloseTime: number;
    marketCap: number;
    peRatio: number;
    week52High: number;
    week52Low: number;
    ytdChange: number;
    lastTradeTime: number;
    isUSMarketOpen: boolean;
}
