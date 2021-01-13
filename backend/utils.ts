export function dateToUnixSeconds(date: Date): number {
    return Math.round(date.getTime() / 1000);
}

export function secondsInMinutesAndSeconds(seconds: number) {
    return {
        minutes: Math.round(seconds / 60),
        seconds: seconds % 60
    }
}
