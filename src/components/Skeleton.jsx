import React from 'react';
import clsx from 'clsx';

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={clsx("animate-pulse rounded-md bg-slate-200/80", className)}
            {...props}
        />
    );
};

export default Skeleton;
