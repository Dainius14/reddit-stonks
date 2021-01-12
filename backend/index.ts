import {PushshiftAPI, Submission} from './pushshift';
import * as fs from 'fs';
import {add, formatISO, startOfDay, sub} from 'date-fns';
import {performance} from 'perf_hooks';
import {IexCloudApi, Quote} from './IEXCloud/iex-cloud-api';
import dotenv from 'dotenv';
import twelveDataStocks from './data/stocks.json';
import twelveDataEtfs from './data/etf.json';
import fakeTickersImport from './data/fake-tickers.json';
import {TwelveDataETF, TwelveDataETFFile, TwelveDataStock, TwelveDataStockFile} from './TwelveData';

const fakeTickers = new Set<string>(fakeTickersImport);

const twelveDataStockSet = new Set<string>((twelveDataStocks as TwelveDataStockFile).data.map(x => x.symbol));
const twelveDataStockMap = new Map<string, TwelveDataStock>();
(twelveDataStocks as TwelveDataStockFile).data.forEach(x => twelveDataStockMap.set(x.symbol, x));

const twelveDataEtfMap = new Map<string, TwelveDataETF>();
(twelveDataEtfs as TwelveDataETFFile).data.forEach(x => twelveDataEtfMap.set(x.symbol, x));

let daysToFetch: number;
let interval: Duration;

const subreddits = ['pennystocks', 'wallstreetbets', 'investing', 'stocks'];

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
    totalChange: number;
    isChangeFinite: boolean;
}

interface SubredditWithSubmissionIds {
    subreddit: string;
    submissionIds: string[];
    change: number;
    isChangeFinite: boolean;
}

function fillEmptyDays(groupedByDays: Record<string, Submission[]>) {
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

function fillEmptySubreddits(groupedBySubreddits: Record<string, Submission[]>) {
    for (const subreddit of subreddits) {
        if (!groupedBySubreddits[subreddit]) {
            groupedBySubreddits[subreddit] = [];
        }
    }
}

function calculateChanges(tickerGroup: TickerWithSubmissionIdsForEachDay) {
    const dayGroups = getDayGroups();

    for (const subreddit of subreddits) {
        for (let i = 0; i < dayGroups.length; i++){
            const currentDay = dayGroups[i];
            const previousDay = dayGroups[i + 1];

            const todaysSubreddit = getSubredditAtDay(currentDay, subreddit)!;
            const tomorrowsSubreddit = getSubredditAtDay(previousDay, subreddit);

            const thisDaySubmissionCount = todaysSubreddit.submissionIds.length;
            const previousDaySubmissionCount = tomorrowsSubreddit?.submissionIds.length ?? 0;

            const {change, isChangeFinite} = getChange(thisDaySubmissionCount, previousDaySubmissionCount);
            todaysSubreddit.change = change;
            todaysSubreddit.isChangeFinite = isChangeFinite;
        }
    }

    for (let i = 0; i < dayGroups.length; i++){
        const currentDay = dayGroups[i];
        const previousDay = dayGroups[i + 1];

        const thisDayGroup = tickerGroup.days.find(day => day.date === currentDay)!;
        const previousDayGroup = tickerGroup.days.find(day => day.date === previousDay);

        const thisDaySubmissionCount = thisDayGroup.subreddits
            .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0);
        const previousDaySubmissionCount = previousDayGroup?.subreddits
            .reduce((sum, subreddit) => sum + subreddit.submissionIds.length, 0) ?? 0;

        const {change, isChangeFinite} = getChange(thisDaySubmissionCount, previousDaySubmissionCount);
        thisDayGroup.totalChange = change;
        thisDayGroup.isChangeFinite = isChangeFinite;
    }

    function getSubredditAtDay(date: string, subreddit: string) {
        return tickerGroup.days.find(day => day.date === date)?.subreddits.find(x => x.subreddit == subreddit);
    }

    function getChange(thisDayCount: number, previousDayCount: number) {
        if (thisDayCount > 0 && previousDayCount > 0) {
            return {
                change: thisDayCount > previousDayCount
                    ? thisDayCount / previousDayCount - 1
                    : -previousDayCount / thisDayCount + 1,
                isChangeFinite: true
            };
        }
        else if (thisDayCount === 0 && previousDayCount === 0) {
            return {
                change: 0,
                isChangeFinite: true
            };
        }
        else {
            return {
                change: thisDayCount > previousDayCount
                    ? 1
                    : -1,
                isChangeFinite: false
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
    const submissionMap = submissions.reduce((result: Record<string, Submission>, submission) => {
        setGroup<Submission>(result, submission.id!, submission)
        return result;
    }, {});

    const tickerGroups = groupSubmissions(submissions);

    tickerGroups.forEach(tickerGroup => calculateChanges(tickerGroup));
    const endTime = performance.now();
    console.log(`Calculations completed in ${Math.round(Math.round(endTime - startTime))} ms`);
    console.log('Tickers found: ', tickerGroups.length);
    console.log('Adding stock info...');
    await addStockData(tickerGroups);

    await writeToFile({
        results: tickerGroups,
        submissions: submissionMap,
        days: getDayGroups(),
        subreddits: subreddits,
        updatedAt: formatISO(new Date(), {representation: 'complete'})
    }, 'results.json');
}

function groupSubmissions(submissions: Submission[]) {
    const submissionsGroupedByTickers = submissions.reduce((result: Record<string, Submission[]>, submission) => {
        const uniqueTickersInTitle = extractTickersFromText(submission.title ?? '');
        const uniqueTickersInText = extractTickersFromText(submission.selftext ?? '');
        const tickers = [...new Set([...uniqueTickersInTitle, ...uniqueTickersInText])];
        tickers.forEach(ticker => addToGroupedArray<Submission>(result, ticker, submission));
        return result;
    }, {});

    const thenGroupedByDays = Object.keys(submissionsGroupedByTickers)
        .map(ticker => ({ ticker, submissions: submissionsGroupedByTickers[ticker] }))
        .reduce((result: Record<string, Record<string, Submission[]>>, {ticker, submissions}) => {
            const groupedByDays = groupSubmissionsByDay(submissions);
            fillEmptyDays(groupedByDays);
            setGroup(result, ticker, groupedByDays);
            return result;
        }, {});

    const thenGroupedBySubreddits = Object.keys(thenGroupedByDays)
        .map(ticker => ({ ticker, days: thenGroupedByDays[ticker] }))
        .reduce((result: Record<string, Record<string, Record<string, Submission[]>>>, {ticker, days}) => {
            const groupedByDaysAndSubreddits = Object.keys(days)
                .map(day => ({ day, submissions: days[day] }))
                .reduce((result2: Record<string, Record<string, Submission[]>>, {day, submissions}) => {
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

function convertObjectStructureToArrayStructure(obj: Record<string, Record<string, Record<string, Submission[]>>>): TickerWithSubmissionIdsForEachDay[] {
    return Object.keys(obj).map(ticker => {
        const currentTickerGroup = obj[ticker];
        const daysGroups: DayWithSubreddits[] = Object.keys(currentTickerGroup).map(date => {
            const currentDateGroup = currentTickerGroup[date];
            const subredditGroups: SubredditWithSubmissionIds[] = Object.keys(currentDateGroup).map(subreddit => {
                const currentSubredditGroup = currentDateGroup[subreddit];
                return {
                    subreddit,
                    submissionIds: currentSubredditGroup.map(submission => submission.id!),
                    change: 0,
                    isChangeFinite: true
                }
            });
            return {
                date,
                subreddits: subredditGroups,
                totalChange: 0,
                isChangeFinite: true
            };
        });
        return {
            ticker,
            days: daysGroups
        };
    });
}

function groupSubmissionsByDay(submissions: Submission[]) {
    return submissions.reduce((result: Record<string, Submission[]>, submission) => {
        const submissionCreated = new Date(submission.created_utc! * 1000);
        const dayGroup = formatISO(startOfDay(submissionCreated), {representation: 'date'});

        addToGroupedArray<Submission>(result, dayGroup, submission);
        return result;
    }, {});
}

function groupSubmissionsBySubreddit(submissions: Submission[]) {
    return submissions.reduce((result: Record<string, Submission[]>, submission) => {
        addToGroupedArray<Submission>(result, submission.subreddit!, submission);
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


async function getSubmissions(startDate: Date, endDate: Date): Promise<Submission[]> {
    const pushshiftAPI = new PushshiftAPI();
    const sixHourIntervals = [];
    while (startDate < endDate) {
        sixHourIntervals.push({
            start: startDate,
            end: add(startDate, interval)
        });
        startDate = add(startDate, interval);
    }

    let submissions: Submission[] = [];
    for (const {start, end} of sixHourIntervals) {
        console.log(`Requesting data from ${formatISO(start)} to ${formatISO(end)}...`);
        const receivedSubmissions = await pushshiftAPI.getSubmissions({
            fields: ['id', 'title', 'link_flair_text', 'selftext', 'score', 'url', 'subreddit', 'created_utc'],
            subreddit: subreddits,
            'selftext:not': '[removed]',
            size: 500,
            before: end,
            after: start,
        });
        console.log(`Received ${receivedSubmissions.length} submissions`);
        submissions = submissions.concat(receivedSubmissions);
    }

    return submissions;
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
    return !fakeTickers.has(ticker) && twelveDataStockSet.has(ticker) || twelveDataEtfMap.has(ticker);
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
        daysToFetch = parseInt(process.env.DAYS_TO_FETCH ?? '3');
        interval = {hours: parseInt(process.env.HOURS_INTERVAL ?? '1')};

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
