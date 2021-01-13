import {Row} from '../pages';

export function calculateData(tickerGroups: Row[], selectedSubreddits: string[]): Row[] {
    return tickerGroups.map(tickerGroup => {
        const newTickerGroup = filterSelectedSubredditsForGroup(selectedSubreddits, tickerGroup);

        calculateChanges(newTickerGroup);

        return newTickerGroup;
    });
}


function calculateChanges(tickerGroup: Row) {
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
        currentDay.totalChange = change;
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

function filterSelectedSubredditsForGroup(selectedSubreddits: string[], tickerGroup: Row): Row {
    // TODO remove when sorted in backend
    const sortedDays = [...tickerGroup.days].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
        key: tickerGroup.key,
        ticker: tickerGroup.ticker,
        stockData: tickerGroup.stockData,
        days: sortedDays.map(day => ({
            date: day.date,
            subreddits: day.subreddits
                .filter(sub => selectedSubreddits.includes(sub.subreddit))
                .sort((a, b) => a.subreddit.localeCompare(b.subreddit)),  // TODO remove when backend sends sorted
            isChangeFinite: false,
            totalChange: 0
        }))
    };
}
