import IEXCloudClient from 'node-iex-cloud';
import axios from 'axios';
import {config} from '../config';
import Quote from 'node-iex-cloud/lib/types/Quote';
import {batchArray} from '../utils';
import Company, {BatchCompany} from 'node-iex-cloud/lib/types/Company';

export class IexCloudApi {

    private iex: IEXCloudClient;

    constructor() {
        this.iex = new IEXCloudClient(axios, {
            sandbox: config.iexIsSandbox,
            publishable: config.iexToken,
            version: 'stable'
        });
    }

    async getBatchedQuotes(tickers: string[]): Promise<Quotes> {

        const tickerGroups = batchArray(tickers, 100);

        let quotes: Record<string, { quote: Quote }> = {};
        for (const batch of tickerGroups) {

            const batchQuotes = await this.iex
                .batchSymbols(batch.join(','))
                .batch()
                .quote()
                .range();
            quotes = {...quotes, ...batchQuotes};
        }
        return tickers.reduce((result: Quotes, ticker) => {
            result[ticker] = quotes[ticker]?.quote as Quote ?? null;
            return result;
        }, {})
    }

    async getBatchedCompanyInfos(tickers: string[]): Promise<Companies> {

        const tickerGroups = batchArray(tickers, 100);

        let companyInfos: Record<string, { company: Company }> = {};
        for (const batch of tickerGroups) {

            const batchCompanyInfos = await this.iex
                    .batchSymbols(batch.join(','))
                    .batch()
                    .company()
                    .range();
            companyInfos = {...companyInfos, ...batchCompanyInfos};
        }

        return tickers.reduce((result: Companies, ticker) => {
            result[ticker] = companyInfos[ticker]?.company ?? null;
            return result;
        }, {})
    }
}

export type Quotes = Record<string, Quote | null>;
export type Companies = Record<string, Company | null>;
