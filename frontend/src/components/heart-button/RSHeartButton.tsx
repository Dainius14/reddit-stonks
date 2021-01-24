import {HeartOutlined, HeartTwoTone} from '@ant-design/icons';
import * as React from 'react';
import {FC} from 'react';
import classNames from 'classnames';

interface RSHeartButtonProps {
    className: string;
    isActivated: boolean;
    isActivatedChanged?: (value: boolean) => void;
}

export const RSHeartButton: FC<RSHeartButtonProps> = ({className, isActivated, isActivatedChanged}) => {
    return isActivated
        ? <HeartTwoTone
            style={{pointerEvents: isActivatedChanged ? undefined : 'none'}}
            className={classNames('rs-heart-button', 'rs-heart-button--activated', className)}
            twoToneColor={'red'}
            onClick={() => isActivatedChanged && isActivatedChanged(false)}
        />
        : <HeartOutlined
            className={classNames('rs-heart-button', className)}
            onClick={() => isActivatedChanged && isActivatedChanged(true)}
        />
}
