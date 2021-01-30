import Title from 'antd/es/typography/Title';
import {Collapse} from 'antd';
import * as React from 'react';
import {FunctionComponent} from 'react';
import './RSExpandedRow.styles.scss';
import {TickerWithSubmissionIdsForEachDay} from '../../models/TableData';
import { RSHeartButton } from '../heart-button/RSHeartButton';
import {SubmissionTable} from './SubmissionsTable';
import {NewsTable} from './NewsTable';

const allSubredditsKey = 'all_subreddits';
const selectedSubredditsKey = 'selectedSubreddits';

interface RSExpandedRowProps {
    rawRow: TickerWithSubmissionIdsForEachDay,
    calculatedRow: TickerWithSubmissionIdsForEachDay,
    availableSubreddits: string[];
    selectedSubreddits: string[],
    isLoved: boolean;
    isLovedChanged: (isLoved: boolean) => void;
}

export const RSExpandedRow: FunctionComponent<RSExpandedRowProps> = ({rawRow, calculatedRow, availableSubreddits,
     selectedSubreddits, isLoved, isLovedChanged}) => {

    const {
        submissionCountsPerSubreddit,
        allSubredditsSubmissionCount,
        selectedSubredditsSubmissionCount,
    } = getSubmissionCounts(availableSubreddits, rawRow, selectedSubreddits);

    return (<div className={'rs-expanded-row'}>
        <div className={'stock-header'}>
            <Title level={4} className={'stock-and-company-title'}>
                {calculatedRow.ticker} | {calculatedRow.tickerName}
                <RSHeartButton
                    className={'rs-expanded-row-heart-button'}
                    isActivated={isLoved}
                    isActivatedChanged={(value) => isLovedChanged(value)}
                />
            </Title>

            <RSStockLink href={`https://finance.yahoo.com/quote/${calculatedRow.ticker}`}>Yahoo Finance</RSStockLink>
            <RSStockLink href={`https://stockanalysis.com/stocks/${calculatedRow.ticker}`}>Stock Analysis</RSStockLink>
            <RSStockLinkSeparator />
            <RSStockLink href={`https://www.google.com/search?q=stock+${calculatedRow.ticker}`}>Google Search Ticker</RSStockLink>
            <RSStockLink href={`https://www.google.com/search?tbm=nws&q=stock+${calculatedRow.ticker}`}>Google News Ticker</RSStockLink>
            {calculatedRow.tickerName &&
            <>
                <RSStockLink href={`https://www.google.com/search?q=${calculatedRow.tickerName}`}>Google Search Company</RSStockLink>
                <RSStockLink href={`https://www.google.com/search?tbm=nws&q=${calculatedRow.tickerName}`}>Google News Company</RSStockLink>
            </>
            }
        </div>

        <Collapse ghost>
            <Collapse.Panel key={'news'} header={`News`}>
                <NewsTable ticker={calculatedRow.ticker}/>
            </Collapse.Panel>

            <Collapse.Panel key={allSubredditsKey} header={`All subreddits (${allSubredditsSubmissionCount})`}>
                <SubmissionTable
                    ticker={calculatedRow.ticker}
                    subreddits={selectedSubreddits}
                    totalSubmissions={allSubredditsSubmissionCount}
                    to={new Date(calculatedRow.days[0].date)}
                    from={new Date(calculatedRow.days[calculatedRow.days.length - 1].date)}
                />
            </Collapse.Panel>

            <Collapse.Panel key={selectedSubredditsKey} header={`Selected subreddits (${selectedSubredditsSubmissionCount})`}>
                <SubmissionTable
                    ticker={calculatedRow.ticker}
                    subreddits={selectedSubreddits}
                    totalSubmissions={selectedSubredditsSubmissionCount}
                    to={new Date(calculatedRow.days[0].date)}
                    from={new Date(calculatedRow.days[calculatedRow.days.length - 1].date)}
                />
            </Collapse.Panel>

            {
                selectedSubreddits.map((subreddit) => {
                    const totalSubmissions = submissionCountsPerSubreddit.get(subreddit)!;

                    if (totalSubmissions === 0) {
                        return null;
                    }

                    return (
                        <Collapse.Panel header={`r/${subreddit} (${totalSubmissions})`} key={subreddit}>
                            <SubmissionTable
                                ticker={calculatedRow.ticker}
                                subreddits={[subreddit]}
                                totalSubmissions={totalSubmissions}
                                to={new Date(calculatedRow.days[0].date)}
                                from={new Date(calculatedRow.days[calculatedRow.days.length - 1].date)}
                            />
                        </Collapse.Panel>
                    );
                })
            }
        </Collapse>
    </div>);
}

const RSStockLink: FunctionComponent<{ href: string }> = ({ href, children }) => (
    <a className={'stock-link'} href={href} target="_blank" rel="noreferrer">{children}</a>
);

const RSStockLinkSeparator: FunctionComponent = () => (
    <Title level={5} className={'stock-link-separator'}>|</Title>
);



function getSubmissionCounts(availableSubreddits: string[], rawRow: TickerWithSubmissionIdsForEachDay, selectedSubreddits: string[]) {
    const submissionCountsPerSubreddit = availableSubreddits.reduce((result, subreddit) => {
        const totalSubmissions = rawRow.days.reduce((sum, day) => {
            const subredditGroup = day.subreddits.find(x => x.subreddit === subreddit);
            return subredditGroup
                ? sum + subredditGroup.submissionCount
                : sum;
        }, 0);
        result.set(subreddit, totalSubmissions);
        return result;
    }, new Map<string, number>());

    const allSubredditsSubmissionCount = [...submissionCountsPerSubreddit].reduce((sum, [_, count]) => sum + count, 0);
    const selectedSubredditsSubmissionCount = [...submissionCountsPerSubreddit].reduce((sum, [subreddit, count]) => selectedSubreddits.includes(subreddit) ? sum + count : sum, 0);
    return {submissionCountsPerSubreddit, allSubredditsSubmissionCount, selectedSubredditsSubmissionCount};
}
