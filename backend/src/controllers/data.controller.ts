import {Context} from 'koa';
import {Database} from '../database/database';
import {config} from '../config';
import {startOfDay, sub} from 'date-fns';
import {MainDataService} from '../services/main-data-service';
import {SubmissionDTO} from '../models/submission-dto';

export class DataController {
    private db: Database;
    private mainDataService: MainDataService;

    constructor() {
        this.db = new Database(config.databasePath);
        this.mainDataService = new MainDataService();
    }

    public getData(ctx: Context) {
        const days = parseInt(ctx.query.days);
        if (Number.isNaN(days)) {
            return ctx.status = 400;
        }

        const startTimestamp = this.getStartTimestampUtc(days);

        const groupedSubmissionResult = this.db.getGroupedSubmissions(startTimestamp);
        const structuredSubmissions = this.mainDataService.transformToStructuredData(groupedSubmissionResult, new Date(startTimestamp * 1000), config.availableSubreddits);

        ctx.body = {
            data: structuredSubmissions,
            updatedAt: new Date(this.db.getLastSubmissionTime()! * 1000).toISOString(),
            daysDesc: this.mainDataService.getDayGroupsAsc(new Date(startTimestamp * 1000)).reverse()
        }
    }

    private getStartTimestampUtc(days: number) {
        return Math.round(startOfDay(sub(new Date(), {days})).getTime() / 1000) - new Date().getTimezoneOffset() * 60;
    }

    public async getAvailableSubreddits(ctx: Context) {
        ctx.body = config.availableSubreddits;
    }


    public async getSubmissions(ctx: Context) {
        const days = parseInt(ctx.query.days);
        if (Number.isNaN(days)) {
            return ctx.status = 400;
        }

        const startTimestamp = this.getStartTimestampUtc(days);

        const submissions = this.db.getSubmissions(startTimestamp);
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
        ctx.body = submissionDtoMap;
    }

    private convertToIsoDate() {

    }
}
