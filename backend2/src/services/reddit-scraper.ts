import {PushshiftAPI, Submission} from './pushshift-api';
import dotenv from 'dotenv';
import {performance} from 'perf_hooks';
import {formatISO9075} from 'date-fns';
import {dateToUnixSeconds, secondsInMinutesAndSeconds} from '../utils';
import {Database} from '../database/database';
import {config} from '../config';
import fakeTickersImport from '../data/fake-tickers.json';
import {TwelveDataETF, TwelveDataETFFile, TwelveDataStock, TwelveDataStockFile} from '../models/TwelveData';
import twelveDataStocks from '../data/stocks.json';
import twelveDataEtfs from '../data/etf.json';
import {DBSubmission} from '../database/database-models';

class RedditScraper {
    private readonly pushshiftApi: PushshiftAPI;
    private readonly db: Database;
    private readonly subredditsToScrape: string[];
    private readonly scrapeSecondsInterval = 3600;

    private readonly tickerRegex = /(?<=\b)[A-Z]{2,6}(?=\b)/g;
    private readonly fakeTickers = new Set<string>(fakeTickersImport);
    private readonly twelveDataStockMap = new Map<string, TwelveDataStock>();
    private readonly twelveDataEtfMap = new Map<string, TwelveDataETF>();

    constructor() {
        this.pushshiftApi = new PushshiftAPI();
        this.db = new Database(config.databasePath);
        this.subredditsToScrape = config.availableSubreddits;
        (twelveDataStocks as TwelveDataStockFile).data.forEach(x => this.twelveDataStockMap.set(x.symbol, x));
        (twelveDataEtfs as TwelveDataETFFile).data.forEach(x => this.twelveDataEtfMap.set(x.symbol, x));
    }

    async main() {
        const functionStartTime = performance.now();
        let totalSubmissionsScraped = 0;
        const lastSubmissionTimeSeconds = this.getLastSubmissionDateUtc();
        console.log(`Starting scraping from ${RedditScraper.formatIsoUtcDate(lastSubmissionTimeSeconds)}...`);
        let startTime = lastSubmissionTimeSeconds + 1;
        let endTime = startTime + this.scrapeSecondsInterval;
        while (startTime < new Date().getTime() / 1000)
        {
            const submissions = await this.getSubmissions(startTime, endTime);
            console.log(`${submissions.length} submissions from ${RedditScraper.formatIsoUtcDate(startTime)} to ${RedditScraper.formatIsoUtcDate(endTime)}`);

            const {submissionAndTickersMap, allTickers} = this.mapSubmissionIdsToTickers(submissions);

            totalSubmissionsScraped += submissions.length;
            const mappedSubmissions = submissions.map(RedditScraper.mapSubmissionsToDb);

            try {
                this.db.insertSubmissions(mappedSubmissions);
                this.db.insertTickers(allTickers);
                this.db.insertSubmissionsToTickers(submissionAndTickersMap);
            }
            catch (e){
                const ex = e as Error;
                console.error(ex.message)
            }

            startTime += this.scrapeSecondsInterval;
            endTime += this.scrapeSecondsInterval;
        }
        const functionEndTime = performance.now();
        console.log('Scraping completed.');
        const elapsedSeconds = Math.round((functionEndTime - functionStartTime) / 1000);
        const {minutes, seconds} = secondsInMinutesAndSeconds(elapsedSeconds);
        console.log(`Submissions: ${totalSubmissionsScraped}. Total time: ${minutes} min ${seconds} s`);
    }

    private static formatIsoUtcDate(seconds: number) {
        const adjustedMilliseconds = (seconds + new Date().getTimezoneOffset() * 60) * 1000;
        return formatISO9075(adjustedMilliseconds);
    }

    private getLastSubmissionDateUtc(): number {
        const dbResult = this.db.getLastSubmissionTime();
        if (dbResult != null) {
            return dbResult;
        }
        return dateToUnixSeconds(new Date(config.scrapeStartDay));
    }

    private async getSubmissions(fromSeconds: number, toSeconds: number): Promise<Submission[]> {
        const submissions = await this.pushshiftApi.getSubmissions({
            size: 100,
            sort_type: 'created_utc',
            before: Math.round(toSeconds),
            after: Math.round(fromSeconds),
            fields: ['id', 'title', 'selftext', 'score', 'url', 'subreddit', 'created_utc', 'author'],
            subreddit: this.subredditsToScrape,
        });

        if (submissions.length === 100) {
            // Received the limit of submissions, repeat request
            const lastSubmissionTime = Math.max(...submissions.map(x => x.created_utc!));
            submissions.push(...await this.getSubmissions(lastSubmissionTime, toSeconds));
        }
        return submissions;
    }

    private mapSubmissionIdsToTickers(submissions: Submission[]) {
        const allTickersSet = new Set<string>();
        const submissionAndTickersMap = submissions.reduce((result: Record<string, Set<string>>, submission) => {
            const tickers = this.getTickers(submission);
            if (tickers.size > 0) {
                tickers.forEach(x => allTickersSet.add(x));
                result[submission.id!] = tickers;
            }
            return result;
        }, {})
        const allTickers = [...allTickersSet];
        return {submissionAndTickersMap, allTickers};
    }

    private getTickers(submission: Submission) {
        const uniqueTickersInTitle = this.extractTickersFromText(submission.title ?? '');
        const uniqueTickersInText = this.extractTickersFromText(submission.selftext ?? '');
        return new Set([...uniqueTickersInText, ...uniqueTickersInTitle]);
    }

    private extractTickersFromText(text: string): string[] {
        const regexMatches = text.matchAll(this.tickerRegex);
        const words = [...regexMatches].map(match => match[0])
        return [...new Set(words)].filter(x => this.isRealTicker(x));
    }

    private isRealTicker(ticker: string) {
        return !this.fakeTickers.has(ticker) && (this.twelveDataStockMap.has(ticker) || this.twelveDataEtfMap.has(ticker));
    }

    private static mapSubmissionsToDb(apiSubmission: Submission): DBSubmission {
        return {
            author: apiSubmission.author!,
            created_utc: apiSubmission.created_utc!,
            id: apiSubmission.id!,
            score: apiSubmission.score!,
            selftext: apiSubmission.selftext,
            subreddit: apiSubmission.subreddit!,
            title: apiSubmission.title!,
            url: apiSubmission.url!
        };
    }

}

(async function () {
    try {
        dotenv.config();
        await new RedditScraper().main();
    }
    catch (ex) {
        console.error(ex)
    }
})();
