import {PushshiftAPI, Submission} from './pushshift-api';
import dotenv from 'dotenv';
import {performance} from 'perf_hooks';
import {formatISO9075} from 'date-fns';
import {dateToUnixSeconds, secondsInMinutesAndSeconds} from '../utils';
import {Database} from '../database/database';
import {config} from '../config';
import {DBSubmission, DBTicker} from '../database/database-models';
import {Companies, IexCloudApi, Quotes} from '../services/iex-cloud-api';
import {TickerInfo, TickerService} from '../services/ticker-service';

class RedditScraper {
    private readonly pushshiftApi: PushshiftAPI;
    private readonly tickerService: TickerService;
    private readonly db: Database;
    private readonly iex: IexCloudApi;
    private readonly subredditsToScrape: string[];
    private readonly scrapeSecondsInterval = 3600;

    constructor() {
        this.pushshiftApi = new PushshiftAPI();
        this.tickerService = new TickerService();
        this.iex = new IexCloudApi();
        this.db = new Database(config.databasePath);
        this.subredditsToScrape = config.availableSubreddits;
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
            const newTickers = this.filterOnlyNewTickers(allTickers);
            console.log(`${newTickers.length} new tickers`);
            const companies = await this.iex.getBatchedCompanyInfos(newTickers);
            const mappedTickersNotInDb = newTickers.map(ticker => this.mapTickerToDb(ticker, companies, allTickers));

            totalSubmissionsScraped += submissions.length;
            const mappedSubmissions = submissions.map(RedditScraper.mapSubmissionToDb);

            try {
                this.db.insertSubmissions(mappedSubmissions);
                this.db.insertTickers(mappedTickersNotInDb);
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

    private filterOnlyNewTickers(allTickers: Map<string, TickerInfo>) {
        const allTickersKeys = [...allTickers.keys()];
        const tickersInDb = this.db.filterExistingTickers(allTickersKeys);
        return allTickersKeys.filter(x => !tickersInDb.includes(x));
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
            metadata: true
        });

        if (submissions.length === 100) {
            // Received the limit of submissions, repeat request
            const lastSubmissionTime = Math.max(...submissions.map(x => x.created_utc!));
            submissions.push(...await this.getSubmissions(lastSubmissionTime, toSeconds));
        }
        return submissions;
    }

    private mapSubmissionIdsToTickers(submissions: Submission[]) {
        const allTickersMap = new Map<string, TickerInfo>();
        const submissionAndTickersMap = submissions.reduce((result: Record<string, Set<string>>, submission) => {
            const tickers = this.getTickers(submission);
            if (tickers.size > 0) {
                tickers.forEach(ticker =>{
                    allTickersMap.set(ticker, this.tickerService.getTickerInfo(ticker));
                });
                result[submission.id!] = tickers;
            }
            return result;
        }, {});

        return {submissionAndTickersMap, allTickers: allTickersMap};
    }

    private getTickers(submission: Submission) {
        const uniqueTickersInTitle = this.tickerService.extractTickersFromText(submission.title ?? '');
        const uniqueTickersInText = this.tickerService.extractTickersFromText(submission.selftext ?? '');
        return new Set([...uniqueTickersInText, ...uniqueTickersInTitle]);
    }

    private mapTickerToDb(ticker: string, companies: Companies, allTickers: Map<string, TickerInfo>): DBTicker {
        const tickerInfo = allTickers.get(ticker)!;
        const iexCompany = companies[ticker];
        return {
            ticker: ticker,
            name: getCompanyName(),
            is_fake: tickerInfo.isFake ? 1 : 0,
            exchange: iexCompany?.exchange ?? tickerInfo.exchange,
            currency: tickerInfo.currency,
            industry: iexCompany?.industry,
            sector: iexCompany?.sector,
            website: iexCompany?.sector
        }

        function getCompanyName() {
            return iexCompany
                ? iexCompany.issueType === 'cs'
                    ? iexCompany.companyName
                    : iexCompany.securityName
                : tickerInfo.companyName;
        }
    }

    private static mapSubmissionToDb(apiSubmission: Submission): DBSubmission {
        return {
            author: apiSubmission.author!,
            created_utc: apiSubmission.created_utc!,
            submission_id: apiSubmission.id!,
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
