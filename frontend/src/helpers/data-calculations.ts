import {TickerWithSubmissionIdsForEachDay} from '../models/TableData';
export function calculateData(tickerGroups: TickerWithSubmissionIdsForEachDay[], selectedSubreddits: Set<string>): TickerWithSubmissionIdsForEachDay[] {
    return tickerGroups.map(tickerGroup => {
        const newTickerGroup = filterSelectedSubredditsForGroup(selectedSubreddits, tickerGroup);
        calculate(newTickerGroup);
        return newTickerGroup;
    });
}


function calculate(tickerGroup: TickerWithSubmissionIdsForEachDay) {
    for (let i = 0; i < tickerGroup.days.length; i++){
        let currentDay = tickerGroup.days[i];
        let previousDay = tickerGroup.days[i + 1];

        let currentDayAllSubmissionCount = 0;
        let previousDayAllSubmissionCount = 0;

        // Change for each subreddit
        for (let j = 0; j < currentDay.subreddits.length; j++){
            const currentDaySubreddit = currentDay.subreddits[j];
            const previousDaySubreddit = previousDay?.subreddits[j];

            const currentSubmissionsCount = currentDaySubreddit.submissionCount;
            const previousSubmissionsCount = previousDaySubreddit?.submissionCount ?? 0;

            const {change, isChangeFinite} = getChange(currentSubmissionsCount, previousSubmissionsCount);
            currentDaySubreddit.change = change;
            currentDaySubreddit.isChangeFinite = isChangeFinite;

            currentDayAllSubmissionCount += currentSubmissionsCount;
            previousDayAllSubmissionCount += previousSubmissionsCount;
        }

        // Total day change
        const {change, isChangeFinite} = getChange(currentDayAllSubmissionCount, previousDayAllSubmissionCount);
        currentDay.change = change;
        currentDay.isChangeFinite = isChangeFinite;


        currentDay.submissionCount = currentDay.subreddits.reduce((sum, subreddit) => sum + subreddit.submissionCount, 0);
    }

    tickerGroup.submissionCount = tickerGroup.days.reduce((sum, day) => sum + day.submissionCount, 0);
}

function getChange(currentCount: number, previousCount: number) {
    if (currentCount > 0 && previousCount > 0) {
        return {
            change: currentCount > previousCount
                ? currentCount / previousCount - 1
                : -previousCount / currentCount + 1,
            isChangeFinite: true
        };
    }
    else if (currentCount === 0 && previousCount === 0) {
        return {
            change: 0,
            isChangeFinite: true
        };
    }
    else {
        return {
            change: currentCount > previousCount
                ? 1
                : -1,
            isChangeFinite: false
        }
    }
}

function filterSelectedSubredditsForGroup(selectedSubreddits: Set<string>, tickerGroup: TickerWithSubmissionIdsForEachDay): TickerWithSubmissionIdsForEachDay {
    return {
        ticker: tickerGroup.ticker,
        tickerName: tickerGroup.tickerName,
        submissionCount: 0,
        days: tickerGroup.days.map(day => ({
            date: day.date,
            subreddits: day.subreddits.filter(sub => selectedSubreddits.has(sub.subreddit)),
            isChangeFinite: false,
            change: 0,
            submissionCount: 0
        }))
    };
}
