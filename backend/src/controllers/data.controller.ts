import {Context} from 'koa';
import {Database} from '../database/database';
import {config} from '../config';
import {endOfDay, getUnixTime, startOfDay} from 'date-fns';
import {MainDataService} from '../services/main-data-service';
import {MainDataResponseDTO, SubmissionDTO} from '../models/dto';

export class DataController {
    private db: Database;
    private mainDataService: MainDataService;

    constructor() {
        this.db = new Database(config.databasePath);
        this.mainDataService = new MainDataService();
    }

    public getData(ctx: Context) {
        const fromDate = startOfDay(new Date(ctx.query.from));
        const toDate = endOfDay(new Date(ctx.query.to));
        const fromDateUnix = getUnixTime(fromDate);
        const toDateUnix = getUnixTime(toDate);

        const groupedSubmissionResult = this.db.getGroupedSubmissions(fromDateUnix, toDateUnix, config.availableSubreddits);
        const structuredSubmissions = this.mainDataService.transformToStructuredData(groupedSubmissionResult, fromDate, toDate, config.availableSubreddits);

        const lastSubmissionTime = this.db.getLastSubmissionTime() ?? new Date().getTime() / 1000;

        ctx.body = {
            data: structuredSubmissions,
            lastSubmissionTime: new Date(lastSubmissionTime * 1000).toISOString(),
            submissionsUpdated: new Date(this.db.getSubmissionsUpdated() * 1000).toISOString(),
            daysDesc: this.mainDataService.getDayGroupsAsc(fromDate, toDate).reverse()
        } as MainDataResponseDTO;
    }

    public async getAvailableSubreddits(ctx: Context) {
        ctx.body = config.availableSubreddits;
    }


    public async getSubmissions(ctx: Context) {
        const ticker = ctx.query.ticker;
        const skip = parseInt(ctx.query.skip);
        const limit = parseInt(ctx.query.limit);
        const sortBy = ctx.query.sortBy;
        const order = ctx.query.order;
        const subreddits = decodeURIComponent(ctx.query.subreddits).split(',');
        const from = startOfDay(new Date(ctx.query.from));
        const to = endOfDay(new Date(ctx.query.to));


        const submissions = this.db.getSubmissions(ticker, skip, limit, sortBy, order === 'asc', from, to, subreddits);
        const submissionDtos: SubmissionDTO[] = submissions.map((submission) => ({
                created_utc: submission.created_utc,
                id: submission.submission_id,
                is_removed: submission.selftext === '[removed]',
                score: submission.score,
                subreddit: submission.subreddit,
                title: submission.title,
                url: submission.url,
                author: submission.author
            }));
        ctx.body = submissionDtos;
    }
}
