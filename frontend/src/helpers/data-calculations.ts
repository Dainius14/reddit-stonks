import {TickerWithSubmissionIdsForEachDay} from '../models/TableData';

export function calculateData(tickerGroups: TickerWithSubmissionIdsForEachDay[], selectedSubreddits: Set<string>): TickerWithSubmissionIdsForEachDay[] {
    return tickerGroups.map(tickerGroup => {
        const newTickerGroup = filterSelectedSubredditsForGroup(selectedSubreddits, tickerGroup);

        calculateChanges(newTickerGroup);

        return newTickerGroup;
    });
}


function calculateChanges(tickerGroup: TickerWithSubmissionIdsForEachDay) {
    for (let i = 0; i < tickerGroup.days.length; i++){
        let currentDay = tickerGroup.days[i];
        let previousDay = tickerGroup.days[i + 1];

        let currentDayAllSubmissionCount = 0;
        let previousDayAllSubmissionCount = 0;

        // Change for each subreddit
        for (let j = 0; j < currentDay.subreddits.length; j++){
            const currentDaySubreddit = currentDay.subreddits[j];
            const previousDaySubreddit = previousDay?.subreddits[j];

            const currentSubmissionsCount = currentDaySubreddit.submissionIds.length;
            const previousSubmissionsCount = previousDaySubreddit?.submissionIds.length ?? 0;

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
    }
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
        days: tickerGroup.days.map(day => ({
            date: day.date,
            subreddits: day.subreddits.filter(sub => selectedSubreddits.has(sub.subreddit)),
            isChangeFinite: false,
            change: 0
        }))
    };
}
