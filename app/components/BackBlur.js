// app/components/BackBlur.js
import React from 'react';

const BackBlur = ({ backgroundImage }) => {
    return (
        <div className="blur-3xl absolute h-full w-full -z-50">
            <span
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'top',
                    display: 'block',
                    height: '100%',
                    width: '100%',
                    transition: 'background-image .4s ease'
                }}
                className=''
            ></span>
            <span className="blur-overlay block absolute h-full w-full z-1 top-0 left-0"></span>
        </div>
    );
};

export default BackBlur;