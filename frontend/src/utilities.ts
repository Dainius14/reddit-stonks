import {format} from 'date-fns';

export function formatDate(date: Date, withSeconds: boolean = false) {
    return format(date, 'yyyy-MM-dd HH:mm' + (withSeconds ? ':ss' : ''));
}

export function formatDateFromUnixSeconds(seconds: number) {
    return formatDate(new Date(seconds * 1000));
}
