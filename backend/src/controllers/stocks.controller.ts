import {Context} from 'koa';
import IEXCloudClient from 'node-iex-cloud';
import {config} from '../config';
import axios from 'axios';
import Quote from 'node-iex-cloud/lib/types/Quote';

export class StocksController {
    private iex: IEXCloudClient;
    constructor() {
        this.iex = new IEXCloudClient(axios, {
            sandbox: config.iexIsSandbox,
            publishable: config.iexToken,
            version: "stable"
        });
    }

    public async getInfo(ctx: Context) {
        const tickers = (ctx.params.ticker as string).split(',');
        if (tickers.length > 10) {
            ctx.status = 400;
            return;
        }

        const quotes = await this.iex
            .batchSymbols(tickers.join(','))
            .batch()
            .quote()
            .range()

        ctx.body = tickers.reduce((result: Record<string, StockData | null>, ticker) => {
            const quote = quotes[ticker]?.quote as Quote;
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
        }, {});
    }
}

export interface StockData {
    companyName: string;
    latestPrice: number;
    change: number;
    changePercent: number;
    low: number;
    high: number;
    open: number;
    close: number;
}
