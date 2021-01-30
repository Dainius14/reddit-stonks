import * as React from 'react';
import {FC, useEffect, useState} from 'react';
import {RedditStonksApi} from '../../api';
import {ColumnType} from 'antd/es/table';
import {formatDateFromUnixSeconds} from '../../utilities';
import {Table} from 'antd';
import {NewsDTO } from '../../../../backend/src/models/dto';

interface NewsTableProps {
    ticker: string;
}

export const NewsTable: FC<NewsTableProps> = ({ticker}) => {

    const [news, setNews] = useState<NewsDTO[] | undefined>(undefined);

    useEffect(() => {
        async function loadNews() {
            let news: NewsDTO[] = [];
            try {
                news = await RedditStonksApi.getNews(ticker)
            }
            catch (e) {
                console.error(e);
            }
            setNews(news);
        }

        loadNews();
    }, [ticker]);

    const columns: ColumnType<NewsDTO>[] = [
        {
            key: 'datetime',
            dataIndex: 'datetime',
            title: 'Date',
            width: 150,
            defaultSortOrder: 'descend',
            render: (created: number) => formatDateFromUnixSeconds(created),
            sorter: (a: NewsDTO, b: NewsDTO) => a.datetime - b.datetime
        },
        {
            key: 'source',
            dataIndex: 'source',
            title: 'Source',
            width: 150,
            sorter: (a: NewsDTO, b: NewsDTO) => a.source.localeCompare(b.source)

        },
        {
            key: 'headline',
            title: 'Headline',
            sorter: (a: NewsDTO, b: NewsDTO) => a.headline.localeCompare(b.headline),
            render: (news: NewsDTO) => <a href={news.url} target="_blank" rel="noreferrer">{news.headline}</a>,
        },
    ];

    return <Table
        className={'extra-small'}
        rowKey={'url'}
        size={'small'}
        dataSource={news}
        columns={columns}
        loading={!news}
    />

}
