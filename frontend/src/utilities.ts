import {format} from 'date-fns';

export function formatDate(date: Date) {
    return format(date, 'yyyy-MM-dd HH:mm');
}

export function formatDateFromUnixSeconds(seconds: number) {
    return formatDate(new Date(seconds * 1000));
}
