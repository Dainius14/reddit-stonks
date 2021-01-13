import {PushshiftAPI, Submission} from '../Pushshift/pushshift-api';
import {DBSubmission} from './db-models';
import {Database} from './database';
import dotenv from 'dotenv';
import {performance} from 'perf_hooks';
import {formatISO9075} from 'date-fns';
import {dateToUnixSeconds, secondsInMinutesAndSeconds} from '../utils';

class PushshiftScraper {
    private _pushshiftApi: PushshiftAPI;
    private _db: Database;

    private readonly _subredditsToScrape: string[];
    private readonly _intervalSeconds: number;

    constructor() {
        this._pushshiftApi = new PushshiftAPI();

        if (!process.env.DB_FILE) {
            throw new Error('Environment variable DB_FILE does not point to a valid database');
        }
        this._db = new Database(process.env.DB_FILE);

        this._intervalSeconds = parseInt(process.env.SCRAPING_INTERVAL_MINUTES!) * 60;
        if (Number.isNaN(this._intervalSeconds)) {
            throw new Error('Environment variable SCRAPING_INTERVAL_MINUTES is not set to a umber');
        }

        this._subredditsToScrape = process.env.SCRAPING_SUBREDDITS?.split(',') ?? [];
        if (this._subredditsToScrape.length === 0) {
            throw new Error('Environment variable SCRAPING_SUBREDDITS is not set to a string list');
        }
    }

    async main() {
        const functionStartTime = performance.now();
        let totalSubmissionsScraped = 0;
        const lastSubmissionTimeSeconds = this.getLastSubmissionDateUtc();
        console.log(`Starting scraping from ${this.formatIsoUtcDate(lastSubmissionTimeSeconds)}...`);
        let startTime = lastSubmissionTimeSeconds + 1;
        let endTime = startTime + this._intervalSeconds;
        while (startTime < new Date().getTime() / 1000)
        {
            const submissions = await this.getSubmissions(startTime, endTime);
            console.log(`${submissions.length} submissions from ${this.formatIsoUtcDate(startTime)} to ${this.formatIsoUtcDate(endTime)}`);
            totalSubmissionsScraped += submissions.length;
            const mappedSubmissions = submissions.map(PushshiftScraper.mapSubmissionsToDb);

            try {
                this._db.insertMany(mappedSubmissions);
            }
            catch (e){
                const ex = e as Error;
                console.error(ex.message)
            }

            startTime += this._intervalSeconds;
            endTime += this._intervalSeconds;
        }
        const functionEndTime = performance.now();
        console.log('Scraping completed.');
        const elapsedSeconds = Math.round((functionEndTime - functionStartTime) / 1000);
        const {minutes, seconds} = secondsInMinutesAndSeconds(elapsedSeconds);
        console.log(`Submissions: ${totalSubmissionsScraped}. Total time: ${minutes} min ${seconds} s`);
    }

    private formatIsoUtcDate(seconds: number) {
        const adjustedMilliseconds = (seconds + new Date().getTimezoneOffset() * 60) * 1000;
        return formatISO9075(adjustedMilliseconds);
    }

    private getLastSubmissionDateUtc(): number {
        const dbResult = this._db.getLastSubmission();
        if (dbResult != null) {
            return dbResult;
        }
        return dateToUnixSeconds(new Date(process.env.SCRAPING_START_TIME_UTC!));
    }

    private async getSubmissions(fromSeconds: number, toSeconds: number): Promise<Submission[]> {
        const submissions = await this._pushshiftApi.getSubmissions({
            size: 100,
            sort_type: 'created_utc',
            before: Math.round(toSeconds),
            after: Math.round(fromSeconds),
            fields: ['id', 'title', 'selftext', 'score', 'url', 'subreddit', 'created_utc', 'author'],
            subreddit: this._subredditsToScrape,
        });

        if (submissions.length === 100) {
            // Received the limit of submissions, repeat request
            const lastSubmissionTime = Math.max(...submissions.map(x => x.created_utc!));
            submissions.push(...await this.getSubmissions(lastSubmissionTime, toSeconds));
        }
        return submissions;
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
        await new PushshiftScraper().main();
    }
    catch (ex) {
        console.error(ex)
    }
})();
