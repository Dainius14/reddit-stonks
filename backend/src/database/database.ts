import BetterSqliteDatabase, {Statement, Transaction} from 'better-sqlite3';
import {DBSubmission} from './database-models';

export class Database {
    private db: BetterSqliteDatabase.Database;

    constructor(filename: string) {
        this.db = new BetterSqliteDatabase(filename);
    }

    public getLastSubmissionTime(): number | undefined {
        const query = this.db.prepare(`
            SELECT created_utc
            FROM submissions
            ORDER BY created_utc DESC
            LIMIT 1
        `);

        return query.get()?.created_utc as number;
    }

    public getSubmissions(from: number): DBSubmission[] {
        const query = this.db.prepare(`
            SELECT *
            FROM submissions
            WHERE created_utc >= @from
            ORDER BY created_utc DESC
        `);

        return query.all({from}) as DBSubmission[];
    }

    public getGroupedSubmissions(from: number): GetAllSubmissionsResult[] {
        interface GetAllSubmissionsResultNoIdsArray {
            ticker: string;
            day_group: string;
            subreddit: string;
            ids: string;
        }

        const query = this.db.prepare(`
            SELECT t.ticker, strftime('%Y-%m-%d', subs.created_utc, 'unixepoch') AS day_group, lower(subs.subreddit) AS subreddit, group_concat(subs.id) AS ids FROM submissions AS subs
            JOIN submission_has_ticker AS sht ON subs.id = sht.submission_id
            JOIN tickers AS t ON t.ticker = sht.ticker
            WHERE subs.created_utc > @from
            GROUP BY t.ticker, day_group, subs.subreddit, t.ticker
        `);

        const results = query.all({from}) as GetAllSubmissionsResultNoIdsArray[];

        return results.map(x => ({...x, ids: x.ids.split(',')}));
    }

    public getAllSubreddits() {
        const query = this.db.prepare(`
            SELECT DISTINCT subreddit
            FROM submissions
        `);

        return (query.all() as { subreddit: string }[]).map(x => x.subreddit);
    }

    public insertSubmissions(submissions: DBSubmission[]): number {
        const query = this.db.prepare(`INSERT INTO submissions (id, subreddit, title, selftext, created_utc, score, author, url)
            VALUES (@id, @subreddit, @title, @selftext, @created_utc, @score, @author, @url)`);
        return this.insertMany(query, submissions);
    }

    public insertTickers(tickers: string[]): number {
        const query = this.db.prepare(`INSERT OR IGNORE INTO tickers (ticker) VALUES (?)`);
        return this.insertMany(query, tickers);
    }

    public insertSubmissionsToTickers(submissionAndTickersMap: Record<string, Set<string>>): number {
        const query = this.db.prepare(`INSERT INTO submission_has_ticker (submission_id, ticker)
            VALUES (@submission_id, @ticker)`);

        const submissionAndTickers = Object
            .keys(submissionAndTickersMap)
            .reduce((res: {submission_id: string, ticker: string}[], submissionId) => {
                const tickers = submissionAndTickersMap[submissionId];
                tickers.forEach(ticker => res.push({submission_id: submissionId, ticker}))
                return res;
            },[]);

        return this.insertMany(query, submissionAndTickers);
    }

    private insertMany(query: Statement<unknown[]>, items: unknown[]): number {
        return this.db.transaction((items) => {
            let insertCount = 0;
            for (const item of items) {
                const res = query.run(item);
                insertCount += res.changes;
            }
            return insertCount;
        })(items);
    }
}

export interface GetAllSubmissionsResult {
    ticker: string;
    day_group: string;
    subreddit: string;
    ids: string[];
}
