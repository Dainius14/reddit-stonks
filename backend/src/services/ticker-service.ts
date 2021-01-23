import fakeTickersImport from '../data/fake-tickers.json';
import twelveDataStocksImport from '../data/stocks.json';
import twelveDataEtfsImport from '../data/etf.json';
import {TwelveDataETF, TwelveDataETFFile, TwelveDataStock, TwelveDataStockFile} from '../models/TwelveData';
import LineByLine from 'n-readlines';

export class TickerService {

    private readonly tickerRegex = /(?<=\b)[A-Z]{1,6}(?=\b)/g;
    private readonly fakeTickers = new Set<string>(fakeTickersImport);
    private readonly twelveDataStockMap = new Map<string, TwelveDataStock>();
    private readonly twelveDataEtfMap = new Map<string, TwelveDataETF>();
    private readonly nasdaqListedMap: Map<string, NasdaqListed>;
    private readonly otherListedMap: Map<string, OtherListed>;

    constructor() {
        (twelveDataStocksImport as TwelveDataStockFile).data.forEach(x => this.twelveDataStockMap.set(x.symbol, x));
        (twelveDataEtfsImport as TwelveDataETFFile).data.forEach(x => this.twelveDataEtfMap.set(x.symbol, x));
        this.nasdaqListedMap = this.createNasdaqListedMap();
        this.otherListedMap = this.createOtherListedMap();
    }

    public extractTickersFromText(text: string): Set<string> {
        const regexMatches = text.matchAll(this.tickerRegex);
        const words = [...regexMatches].map(match => match[0])
        return new Set(words);
    }

    public getTickerInfo(ticker: string): TickerInfo {
        const twelveDataStock = this.twelveDataStockMap.get(ticker);
        const twelveDataEtf = this.twelveDataEtfMap.get(ticker);
        const nasdaqListed = this.nasdaqListedMap.get(ticker);
        const otherListed = this.otherListedMap.get(ticker);
        return {
            isFake: this.fakeTickers.has(ticker) || (!twelveDataStock && !twelveDataEtf && !nasdaqListed && !otherListed),
            companyName: nasdaqListed?.securityName ?? twelveDataStock?.name,
            currency: nasdaqListed ? 'USD' : twelveDataStock?.currency,
            exchange: nasdaqListed ? 'NASDAQ' : twelveDataStock?.exchange
        };
    }


    private createNasdaqListedMap() {
        return this.readNasdaqTxt('./src/data/nasdaqlisted.txt', lineParts => ({
            symbol: lineParts[0],
            securityName: lineParts[1],
            marketCategory: lineParts[2],
            testIssue: lineParts[3],
            financialStatus: lineParts[4],
            roundLotSize: parseInt(lineParts[5]),
            etf: lineParts[6] === 'Y',
            nextShares: lineParts[7],
        } as NasdaqListed), 'symbol');
    }

    private createOtherListedMap() {
        return this.readNasdaqTxt('./src/data/otherlisted.txt', lineParts => ({
            atcSymbol: lineParts[0],
            securityName: lineParts[1],
            exchange: lineParts[2],
            cqsSymbol: lineParts[3],
            etf: lineParts[4] === 'Y',
            roundLotSize: parseInt(lineParts[5]),
            testIssue: lineParts[6],
            nasdaqSymbol: lineParts[7],
        } as OtherListed), 'atcSymbol');
    }

    private readNasdaqTxt<T>(filePath: string, onLine: (lineParts: string[]) => T, key: string): Map<string, T> {
        const result = new Map<string, T>();

        const liner = new LineByLine(filePath);
        let line;
        let lineNumber = 0;
        while (line = liner.next()) {
            if (lineNumber === 0) continue;

            const lineParts = line.toString('ascii').split('|');

            const parsedObject: T = onLine(lineParts);

            const nasdaqListed: NasdaqListed = {
                symbol: lineParts[0],
                securityName: lineParts[1],
                marketCategory: lineParts[2],
                testIssue: lineParts[3],
                financialStatus: lineParts[4],
                roundLotSize: parseInt(lineParts[5]),
                etf: lineParts[6] === 'Y',
                nextShares: lineParts[7],

            };

            result.set((parsedObject as any)[key], parsedObject)
            lineNumber++;
        }
        return result;
    }
}

export interface TickerInfo {
    isFake: boolean;
    companyName?: string;
    currency?: string;
    exchange?: string;
}

interface NasdaqListed {
    symbol: string;
    securityName: string;
    marketCategory: string;
    testIssue: string;
    financialStatus: string;
    roundLotSize: number;
    etf: boolean;
    nextShares: string;
}

interface OtherListed {
    atcSymbol: string;
    securityName: string;
    exchange: string;
    cqsSymbol: string;
    etf: boolean;
    roundLotSize: number;
    testIssue: string;
    nasdaqSymbol: string;
}
