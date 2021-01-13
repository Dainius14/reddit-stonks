import BetterSqliteDatabase from 'better-sqlite3';
import {DBSubmission} from './db-models';

export class Database {
    private _db: BetterSqliteDatabase.Database;

    constructor(filename: string) {
        this._db = new BetterSqliteDatabase(filename);
    }

    public getLastSubmission(): number | undefined {
        const query = this._db.prepare(`
            SELECT created_utc
            FROM submissions
            ORDER BY created_utc DESC
            LIMIT 1
        `);

        return query.get()?.created_utc as number;
    }

    public getSubmissions(from: number, to: number): DBSubmission[] {
        const query = this._db.prepare(`
            SELECT *
            FROM submissions
            WHERE created_utc >= @from AND created_utc < @to
            ORDER BY created_utc DESC
        `);

        return query.all({from, to}) as DBSubmission[];
    }

    public insertMany(submission: DBSubmission[]): number {
        const query = this._db.prepare(`INSERT INTO submissions (id, subreddit, title, selftext, created_utc, score, author, url)
            VALUES (@id, @subreddit, @title, @selftext, @created_utc, @score, @author, @url)`);

        const transaction = this._db.transaction((items) => {
            let insertCount = 0;
            for (const item of items) {
                const res = query.run(item);
                insertCount += res.changes;
            }
            return insertCount;
        });
        return transaction(submission);
    }
}
