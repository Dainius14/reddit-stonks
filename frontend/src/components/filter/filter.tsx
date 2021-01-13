import * as React from 'react';
import {Checkbox} from "antd";
import {CheckboxValueType} from 'antd/es/checkbox/Group';

export function RSFilter(props: {
    subreddits: string[],
    onChange: (value: CheckboxValueType[]) => void
}) {
    return <Checkbox.Group
        options={props.subreddits}
        defaultValue={props.subreddits}
        onChange={props.onChange}
    />
}
