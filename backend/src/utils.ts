import {startOfDay, sub} from 'date-fns';

export function dateToUnixSeconds(date: Date): number {
    return Math.round(date.getTime() / 1000);
}

export function secondsInMinutesAndSeconds(seconds: number) {
    return {
        minutes: Math.round(seconds / 60),
        seconds: seconds % 60
    }
}

export function getSomeDaysAgoStartOfDayTimestamp(days: number) {
    return Math.round(startOfDay(sub(new Date(), {days})).getTime() / 1000);
}

export function batchArray<T>(input: T[], batchSize: number): T[][] {
    return input.reduce((result: T[][], item) => {
        const batch = result[result.length - 1];
        if (batch.length < batchSize) {
            batch.push(item);
        }
        else {
            result.push([item])
        }
        return result;
    }, [[]])
}
