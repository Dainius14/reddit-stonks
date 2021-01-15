import * as fs from 'fs';
import {add, formatISO, startOfDay, sub} from 'date-fns';
import {performance} from 'perf_hooks';
import {IexCloudApi, Quote} from './IEXCloud/iex-cloud-api';
import dotenv from 'dotenv';
import twelveDataStocks from './data/stocks.json';
import twelveDataEtfs from './data/etf.json';
import fakeTickersImport from './data/fake-tickers.json';
import {TwelveDataETF, TwelveDataETFFile, TwelveDataStock, TwelveDataStockFile} from './TwelveData';
import {DBSubmission} from './pushshift-scraper/db-models';
import {Database} from './pushshift-scraper/database';
import {dateToUnixSeconds} from './utils';
import {Submission} from './Pushshift/pushshift-api';

const fakeTickers = new Set<string>(fakeTickersImport);

const twelveDataStockSet = new Set<string>((twelveDataStocks as TwelveDataStockFile).data.map(x => x.symbol));
const twelveDataStockMap = new Map<string, TwelveDataStock>();
(twelveDataStocks as TwelveDataStockFile).data.forEach(x => twelveDataStockMap.set(x.symbol, x));

const twelveDataEtfMap = new Map<string, TwelveDataETF>();
(twelveDataEtfs as TwelveDataETFFile).data.forEach(x => twelveDataEtfMap.set(x.symbol, x));

let daysToFetch: number;
let subreddits: string[] = [];

const tickerRegex = /[A-Z]{3,5}/g;

interface StockData {
    companyName: string;
    latestPrice: number;
    change: number;
    changePercent: number;
    low: number;
    high: number;
    open: number;
    close: number;
}

interface TickerWithSubmissionIdsForEachDay {
    ticker: string;
    stockData?: StockData;
    days: DayWithSubreddits[];
}

interface DayWithSubreddits {
    date: string;
    subreddits: SubredditWithSubmissionIds[];
}

interface SubredditWithSubmissionIds {
    subreddit: string;
    submissionIds: string[];
}

interface SubmissionDTO {
    id: string;
    subreddit: string;
    title: string;
    created_utc: number;
    score: number;
    url: string;
    is_removed: boolean;
}

function fillEmptyDays(groupedByDays: Record<string, DBSubmission[]>) {
    for (const date of getDayGroups()) {
        if (!groupedByDays[date]) {
            groupedByDays[date] = [];
        }
    }
}

function getDayGroups() {
    const periodEndDate = getStartOfTomorrow();
    let periodStartDate = sub(periodEndDate, {days: daysToFetch});
    const groups = [];
    while (periodStartDate < periodEndDate) {
        groups.push(periodStartDate);
        periodStartDate = add(periodStartDate, {days: 1});
    }
    return groups
        .sort((a, b) => b.getTime() - a.getTime())
        .map(date => formatISO(date, {representation: 'date'}));
}

function fillEmptySubreddits(groupedBySubreddits: Record<string, DBSubmission[]>) {
    for (const subreddit of subreddits) {
        if (!groupedBySubreddits[subreddit]) {
            groupedBySubreddits[subreddit] = [];
        }
    }
}

function sortData(tickerGroups: TickerWithSubmissionIdsForEachDay[], submissions: Record<string, DBSubmission>) {
    tickerGroups.sort((a, b) => a.ticker.localeCompare(b.ticker));

    for (const tickerGroup of tickerGroups) {
        tickerGroup.days.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const day of tickerGroup.days) {
            day.subreddits.sort((a, b) =>
                a.subreddit.localeCompare(b.subreddit));

            for (const subredditGroup of day.subreddits) {
                subredditGroup.submissionIds.sort((a, b) =>
                    submissions[b].created_utc - submissions[a].created_utc);
            }
        }
    }
}

async function main2() {
    const periodEndDate = getStartOfTomorrow();
    const periodStartDate = sub(periodEndDate, {days: daysToFetch});

    console.log('Getting submissions...')
    const submissions = await getSubmissions(periodStartDate, periodEndDate);

    console.log('Total submissions received: ', submissions.length);
    console.log('Running calculations...');
    const startTime = performance.now();
    const submissionMap = submissions.reduce((result: Record<string, DBSubmission>, submission) => {
        setGroup<DBSubmission>(result, submission.id!, submission)
        return result;
    }, {});

    const tickerGroups = groupSubmissions(submissions);

    sortData(tickerGroups, submissionMap);

    const submissionDtoMap = submissions.reduce((result: Record<string, SubmissionDTO>, submission) => {
        result[submission.id] = {
            created_utc: submission.created_utc,
            id: submission.id,
            is_removed: submission.selftext === '[removed]',
            score: submission.score,
            subreddit: submission.subreddit,
            title: submission.title,
            url: submission.url
        };
        return result;
    }, {});

    const endTime = performance.now();
    console.log(`Calculations completed in ${Math.round(Math.round(endTime - startTime))} ms`);
    console.log('Tickers found: ', tickerGroups.length);
    console.log('Adding stock info...');
    await addStockData(tickerGroups);

    await writeToFile({
        results: tickerGroups,
        submissions: submissionDtoMap,
        days: getDayGroups(),
        subreddits: subreddits,
        updatedAt: formatISO(new Date(), {representation: 'complete'})
    }, 'results.json');
}

function groupSubmissions(submissions: DBSubmission[]) {
    const submissionsGroupedByTickers = submissions.reduce((result: Record<string, DBSubmission[]>, submission) => {
        const uniqueTickersInTitle = extractTickersFromText(submission.title ?? '');
        const uniqueTickersInText = extractTickersFromText(submission.selftext ?? '');
        const tickers = [...new Set([...uniqueTickersInTitle, ...uniqueTickersInText])];
        tickers.forEach(ticker => addToGroupedArray<DBSubmission>(result, ticker, submission));
        return result;
    }, {});

    const thenGroupedByDays = Object.keys(submissionsGroupedByTickers)
        .map(ticker => ({ ticker, submissions: submissionsGroupedByTickers[ticker] }))
        .reduce((result: Record<string, Record<string, DBSubmission[]>>, {ticker, submissions}) => {
            const groupedByDays = groupSubmissionsByDay(submissions);
            fillEmptyDays(groupedByDays);
            setGroup(result, ticker, groupedByDays);
            return result;
        }, {});

    const thenGroupedBySubreddits = Object.keys(thenGroupedByDays)
        .map(ticker => ({ ticker, days: thenGroupedByDays[ticker] }))
        .reduce((result: Record<string, Record<string, Record<string, DBSubmission[]>>>, {ticker, days}) => {
            const groupedByDaysAndSubreddits = Object.keys(days)
                .map(day => ({ day, submissions: days[day] }))
                .reduce((result2: Record<string, Record<string, DBSubmission[]>>, {day, submissions}) => {
                    const groupedBySubreddits = groupSubmissionsBySubreddit(submissions);
                    fillEmptySubreddits(groupedBySubreddits);
                    setGroup(result2, day, groupedBySubreddits);
                    return result2;
                }, {})
            setGroup(result, ticker, groupedByDaysAndSubreddits);
            return result;
        }, {})

    return convertObjectStructureToArrayStructure(thenGroupedBySubreddits);
}

function convertObjectStructureToArrayStructure(obj: Record<string, Record<string, Record<string, DBSubmission[]>>>): TickerWithSubmissionIdsForEachDay[] {
    return Object.keys(obj).map(ticker => {
        const currentTickerGroup = obj[ticker];
        const daysGroups: DayWithSubreddits[] = Object.keys(currentTickerGroup).map(date => {
            const currentDateGroup = currentTickerGroup[date];
            const subredditGroups: SubredditWithSubmissionIds[] = Object.keys(currentDateGroup).map(subreddit => {
                const currentSubredditGroup = currentDateGroup[subreddit];
                return {
                    subreddit,
                    submissionIds: currentSubredditGroup.map(submission => submission.id!)
                }
            });
            return {
                date,
                subreddits: subredditGroups
            };
        });
        return {
            ticker,
            days: daysGroups
        };
    });
}

function groupSubmissionsByDay(submissions: DBSubmission[]) {
    return submissions.reduce((result: Record<string, DBSubmission[]>, submission) => {
        const submissionCreated = new Date(submission.created_utc! * 1000);
        const dayGroup = formatISO(startOfDay(submissionCreated), {representation: 'date'});

        addToGroupedArray<DBSubmission>(result, dayGroup, submission);
        return result;
    }, {});
}

function groupSubmissionsBySubreddit(submissions: DBSubmission[]) {
    return submissions.reduce((result: Record<string, DBSubmission[]>, submission) => {
        addToGroupedArray<DBSubmission>(result, submission.subreddit!.toLowerCase(), submission);
        return result;
    }, {});
}

function addToGroupedArray<T>(groups: Record<string, T[]>, groupNameToAddTo: string, item: T) {
    const existingGroup = groups[groupNameToAddTo];
    if (existingGroup) {
        existingGroup.push(item);
    }
    else {
        groups[groupNameToAddTo] = [item];
    }
}

function setGroup<T>(groups: Record<string, T>, groupNameToAddTo: string, item: T) {
    const existingGroup = groups[groupNameToAddTo];
    if (existingGroup) {
        throw new Error(`Group '${groupNameToAddTo}' already exists`);
    }
    else {
        groups[groupNameToAddTo] = item;
    }
}


function getSubmissions(startDate: Date, endDate: Date): DBSubmission[] {
    const db = new Database(process.env.DB_FILE!);
    return db.getSubmissions(dateToUnixSeconds(startDate), dateToUnixSeconds(endDate));
}


function extractTickersFromText(text: string): string[] {
    const regexMatches = text.matchAll(tickerRegex);
    const words = [...regexMatches].map(match => match[0])
    return [...new Set(words)].filter(isRealTicker);
}

async function writeToFile(data: any, fileName: string) {
    try {
        const startTime = performance.now();
        const json = JSON.stringify(data, null, 4);
        const encodedText = new TextEncoder().encode(json);
        await fs.promises.writeFile(fileName, encodedText);
        const endTime = performance.now();
        const sizeInMb = Math.round(encodedText.length / 1024 / 1024 * 100) / 100;
        console.log(`Wrote ${sizeInMb} MB file in ${Math.round(endTime - startTime)} ms`);
    } catch (ex) {
        console.error('Can\'t write results to file', ex);
    }
}

function isRealTicker(ticker: string) {
    return !fakeTickers.has(ticker) && (twelveDataStockSet.has(ticker) || twelveDataEtfMap.has(ticker));
}

function getStartOfTomorrow() {
    const today = new Date();
    const tomorrow = add(today, {days: 1});
    return startOfDay(tomorrow);
}

async function addStockData(tickerGroups: TickerWithSubmissionIdsForEachDay[]) {
    let tickersIterated = 0;

    const batchSize = 10;
    while (tickersIterated < tickerGroups.length) {
        const tickerGroupBatch = tickerGroups.slice(tickersIterated, tickersIterated + batchSize);
        const tickerBatch = tickerGroupBatch.map(x => x.ticker);
        const stockQuotes = await getStockQuotes(tickerBatch);
        for (const [ticker, quote] of stockQuotes) {
            tickerGroupBatch.find(x => x.ticker === ticker)!.stockData = mapStockData(quote);
        }
        tickersIterated += batchSize;
    }
}

function mapStockData(quote: Quote) {
    return {
        companyName: quote.companyName,
        latestPrice: quote.latestPrice,
        open: quote.open,
        close: quote.close,
        change: quote.change,
        changePercent: quote.changePercent,
        low: quote.low,
        high: quote.high,
    };
}

async function getStockQuotes(tickers: string[]) {
    const iexCloudApi = new IexCloudApi({hostname: process.env.IEX_CLOUD_HOST!, token: process.env.IEX_CLOUD_TOKEN!});
    console.log(`Getting stock data for '${tickers.join(',')}'...`);
    return (await iexCloudApi.getQuotes(tickers));
}

(async () => {
    try {
        dotenv.config();
        subreddits = process.env.SCRAPING_SUBREDDITS!.split(',').sort();
        daysToFetch = parseInt(process.env.DAYS_TO_FETCH ?? '3');

        console.log('Starting application...');
        const start = performance.now();

        await main2();

        const end = performance.now();
        console.log(`Done. Total time: ${Math.round(end - start)} ms`);
    }
    catch (ex) {
        console.error(ex);
    }
})();
