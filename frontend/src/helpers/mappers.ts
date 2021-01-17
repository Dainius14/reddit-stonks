import {
    DayWithSubreddits,
    SubredditWithSubmissionIds,
    TickerWithSubmissionIdsForEachDay,
    TickerWithSubmissionIdsForEachDayDTO,
} from '../models/TableData';

export function mapFromTickerGroupDtos(tickerGroups: TickerWithSubmissionIdsForEachDayDTO[]) {
    const mappedTickerGroups: TickerWithSubmissionIdsForEachDay[] = [];

    for (const tickerGroup of tickerGroups) {

        const mappedDayGroups = [];
        for (const dayGroup of tickerGroup.days) {

            const mappedSubredditGroups = dayGroup.subreddits.map(subredditGroup => ({
                ...subredditGroup,
                change: 0,
                isChangeFinite: true
            } as SubredditWithSubmissionIds));

            mappedDayGroups.push({
                ...dayGroup,
                subreddits: mappedSubredditGroups,
                change: 0,
                isChangeFinite: true,
            } as DayWithSubreddits)
        }

        mappedTickerGroups.push({
            ...tickerGroup,
            days: mappedDayGroups
        } as TickerWithSubmissionIdsForEachDay);
    }

    return mappedTickerGroups;
}
