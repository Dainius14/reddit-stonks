import {Context} from 'koa';
import {NewsDTO, NewsResponseDTO, StockDataDTO, StockDataResponseDTO} from '../models/dto';
import {IexCloudApi} from '../services/iex-cloud-api';
import {Database} from '../database/database';
import {config} from '../config';
import currenciesImport from '../data/currencies.json';

const currencies = currenciesImport as Currencies;

export class StocksController {
    private readonly iex: IexCloudApi;
    private readonly db: Database;

    constructor() {
        this.iex = new IexCloudApi();
        this.db = new Database(config.databasePath);
    }

    public async getInfo(ctx: Context) {
        const tickers = (ctx.params.ticker as string).split(',');
        // const tickerCurrencies = this.db.getTickerCurrencies(tickers)

        const quotes = await this.iex.getBatchedQuotes(tickers);

        ctx.body = tickers.reduce((result: Record<string, StockDataDTO | null>, ticker) => {
            const quote = quotes[ticker];
            if (!quote) {
                result[ticker] = null;
            }
            else {
                result[ticker] = {
                    change: quote.change,
                    changePercent: quote.changePercent,
                    latestPrice: quote.latestPrice,
                    close: quote.close,
                    open: quote.open,
                    high: quote.high,
                    low: quote.low,
                    currency: ''
                };
            }
            return result;
        }, {}) as StockDataResponseDTO;
    }

    public async getNews(ctx: Context) {
        const ticker = (ctx.params.ticker as string);
        const news = await this.iex.getNews(ticker);

        ctx.body = news.filter(x => x.lang === 'en').map(x => ({
            datetime: Math.round(x.datetime as unknown as number / 1000),
            headline: x.headline,
            source: x.source,
            url: x.url
        } as NewsDTO)) as NewsResponseDTO;
    }
}

interface Currency {
    symbol: string;
    name: string;
    symbol_native: string;
    decimal_digits: number;
    rounding: number;
    code: string;
    name_plural: string;
}

interface Currencies extends Record<string, Currency> {

}
