import Title from 'antd/es/typography/Title';
import {Collapse} from 'antd';
import * as React from 'react';
import {Row, Submission} from '../pages';
import {formatDate, formatDateFromUnixSeconds} from '../utilities';
import {FunctionComponent} from 'react';

export const RSExpandedRow = ({row, allSubmissions}: {
    row: Row,
    allSubmissions: Record<string, Submission>
}) => {
    const submissionGroups: Record<string, Submission[]> = {};
    for (const day of row.days) {
        for (const subreddit of day.subreddits) {
            const mappedSubmissions = subreddit.submissionIds.map(id => allSubmissions[id]);
            if (submissionGroups[subreddit.subreddit]) {
                submissionGroups[subreddit.subreddit].push(...mappedSubmissions);
            } else {
                submissionGroups[subreddit.subreddit] = mappedSubmissions;
            }
        }
    }
    const submissions = Object
        .keys(submissionGroups)
        .map(subreddit => {
            const submissions = submissionGroups[subreddit];
            return {subreddit, submissions};
        })
        .filter(x => x.submissions.length > 0);

    return (<>
        <div>
            <Title level={3} className={'stock-and-company-title'}>
                {row.ticker}{row.stockData?.companyName ? ' : ' + row.stockData.companyName : ''}
            </Title>
            <RSStockLink href={`https://finance.yahoo.com/quote/${row.ticker}`}>Yahoo Finance</RSStockLink>
            <RSStockLink href={`https://stockanalysis.com/stocks/${row.ticker}`}>Stock Analysis</RSStockLink>
            <RSStockLinkSeparator />
            <RSStockLink href={`https://www.google.com/search?q=stock+${row.ticker}`}>Google Search Ticker</RSStockLink>
            <RSStockLink href={`https://www.google.com/search?tbm=nws&q=stock+${row.ticker}`}>Google News Ticker</RSStockLink>
            {row.stockData &&
            <>
                <RSStockLink href={`https://www.google.com/search?q=${row.stockData.companyName}`}>Google Search Company</RSStockLink>
                <RSStockLink href={`https://www.google.com/search?tbm=nws&q=${row.stockData.companyName}`}>Google News Company</RSStockLink>
            </>
            }

        </div>
        <Collapse ghost>
            {
                submissions.map(({subreddit, submissions}) => {
                    return (
                        <Collapse.Panel header={`r/${subreddit} (${submissions.length})`} key={subreddit}>
                            {
                                submissions.map(submission => (
                                    <div>
                                        <a href={submission.url}>
                                            {formatDateFromUnixSeconds(parseInt(submission.created_utc))} | {submission.title}
                                        </a>
                                    </div>
                                ))
                            }
                        </Collapse.Panel>
                    );
                })
            }
        </Collapse>
    </>);
}

const RSStockLink: FunctionComponent<{ href: string }> = ({ href, children }) => (
    <Title level={5} className={'stock-link'}>
        <a href={href} target="_blank" rel="noopener">{children}</a>
    </Title>
);

const RSStockLinkSeparator: FunctionComponent = () => (
    <Title level={5} className={'stock-link'}>|</Title>
);
