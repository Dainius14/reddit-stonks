import {Database} from '../database/database';
import {config, redditConfig} from '../config';
import dotenv from 'dotenv';
import Snoowrap from 'snoowrap';
import {batchArray, getSomeDaysAgoStartOfDayTimestamp, secondsInMinutesAndSeconds} from '../utils';
import {performance} from 'perf_hooks';
import {sub} from 'date-fns';

class RedditRescraper {
    private readonly db: Database;
    private readonly snoowrap: Snoowrap;

    constructor() {
        this.db = new Database(config.databasePath);
        this.snoowrap = new Snoowrap({
            username: redditConfig.username,
            password: redditConfig.password,
            clientId: redditConfig.clientId,
            clientSecret: redditConfig.clientSecret,
            userAgent: `client ${redditConfig.clientId} personal scraper`
        });

        this.snoowrap.config({
            continueAfterRatelimitError: true
        });
    }

    async main() {
        const start = performance.now();
        console.log('Starting rescrapping...');
        const startTimestamp = Math.round(sub(new Date(), {hours: 3}).getTime() / 1000);

        const submissions = this.db.getSubmissionIds(startTimestamp);
        console.log(`Rescraping ${submissions.length} submissions`);
        const batchedSubmissions = batchArray(submissions, 100);

        let updated = 0;
        for (const batch of batchedSubmissions) {
            const snoowrapSubmissions = batch.map(x => this.snoowrap.getSubmission(x));
            const response = await this.snoowrap.getContentByIds(snoowrapSubmissions);
            const updatedSubmissions = response.map(submission => ({
                id: submission.id,
                score: submission.score
            }));
            this.db.updateSubmissionScores(updatedSubmissions);
            updated += updatedSubmissions.length;
            console.log(`Updated ${updated} of ${submissions.length}`);
        }

        this.db.setSubmissionsUpdated(Math.round(new Date().getTime() / 1000));

        const end = performance.now();
        const elapsedSeconds = Math.round((end - start) / 1000);
        const {minutes, seconds} = secondsInMinutesAndSeconds(elapsedSeconds);
        console.log(`Completed. Total time: ${minutes} min ${seconds} s`);
    }
}



(async function () {
    try {
        dotenv.config();
        await new RedditRescraper().main();
    }
    catch (ex) {
        console.error(ex)
    }
})();
