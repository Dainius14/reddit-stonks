import {Context} from 'koa';
import {Database} from '../database/database';
import {config} from '../config';
import {startOfDay, sub} from 'date-fns';
import {MainDataService} from '../services/main-data-service';
import {MainDataResponseDTO, SubmissionDTO, SubmissionsResponseDTO} from '../models/dto';
import {getSomeDaysAgoEndOfDayTimestamp, getSomeDaysAgoStartOfDayTimestamp} from '../utils';

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

        const startTimestamp = getSomeDaysAgoStartOfDayTimestamp(days);
        const endTimeStamp = getSomeDaysAgoEndOfDayTimestamp(days);

        const groupedSubmissionResult = this.db.getGroupedSubmissions(startTimestamp, endTimeStamp);
        const structuredSubmissions = this.mainDataService.transformToStructuredData(groupedSubmissionResult, new Date(startTimestamp * 1000), new Date(endTimeStamp * 1000), config.availableSubreddits);

        const lastSubmissionTime = this.db.getLastSubmissionTime() ?? new Date().getTime() / 1000;

        ctx.body = {
            data: structuredSubmissions,
            lastSubmissionTime: new Date(lastSubmissionTime * 1000).toISOString(),
            submissionsUpdated: new Date(this.db.getSubmissionsUpdated() * 1000).toISOString(),
            daysDesc: this.mainDataService.getDayGroupsAsc(new Date(startTimestamp * 1000), new Date(endTimeStamp * 1000)).reverse()
        } as MainDataResponseDTO;
    }

    public async getAvailableSubreddits(ctx: Context) {
        ctx.body = config.availableSubreddits;
    }


    public async getSubmissions(ctx: Context) {
        const days = parseInt(ctx.query.days);
        if (Number.isNaN(days)) {
            return ctx.status = 400;
        }

        const startTimestamp = getSomeDaysAgoStartOfDayTimestamp(days);

        const submissions = this.db.getSubmissions(startTimestamp);
        const submissionDtoMap = submissions.reduce((result: Record<string, SubmissionDTO>, submission) => {
            result[submission.id] = {
                created_utc: submission.created_utc,
                id: submission.id,
                is_removed: submission.selftext === '[removed]',
                score: submission.score,
                subreddit: submission.subreddit,
                title: submission.title,
                url: submission.url,
                author: submission.author
            };
            return result;
        }, {});
        ctx.body = submissionDtoMap as SubmissionsResponseDTO;
    }
}
