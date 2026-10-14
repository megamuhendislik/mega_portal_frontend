import React, { useEffect, useState } from 'react';

// İçeriği yukarıdan aşağı açar; open true olunca yükseklik 0'dan içeriğe kadar kayar.
const Expand = ({ open, children }) => {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setShown(open));
        return () => cancelAnimationFrame(id);
    }, [open]);

    return (
        <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${shown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden min-h-0">{children}</div>
        </div>
    );
};

export default Expand;
