import {Context} from 'koa';
import {StockDataDTO, StockDataResponseDTO} from '../models/dto';
import {IexCloudApi} from '../services/iex-cloud-api';

export class StocksController {
    private iex: IexCloudApi;

    constructor() {
        this.iex = new IexCloudApi();
    }

    public async getInfo(ctx: Context) {
        const tickers = (ctx.params.ticker as string).split(',');

        const quotes = await this.iex.getBatchedQuotes(tickers);

        ctx.body = tickers.reduce((result: Record<string, StockDataDTO | null>, ticker) => {
            const quote = quotes[ticker];
            if (!quote) {
                result[ticker] = null;
            }
            else {
                result[ticker] = {
                    companyName: quote.companyName,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    latestPrice: quote.latestPrice,
                    close: quote.close,
                    open: quote.open,
                    high: quote.high,
                    low: quote.low,
                };
            }
            return result;
        }, {}) as StockDataResponseDTO;
    }
}
