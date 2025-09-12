'use client';

import { useState, useEffect } from 'react';

const Toast = ({ message, type = 'success', isVisible, onClose, duration = 4000 }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // Trigger slide-up animation
            setTimeout(() => setIsAnimating(true), 10);
            
            const timer = setTimeout(() => {
                setIsAnimating(false);
                setTimeout(() => onClose(), 300); // Wait for slide-down animation
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose, duration]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => onClose(), 300);
    };

    if (!isVisible) return null;

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return 'text-green-500';
            case 'error':
                return 'text-red-500';
            case 'info':
                return 'text-blue-500';
            case 'warning':
                return 'text-amber-500';
            default:
                return 'text-gray-500';
        }
    };

    const getIcon = () => {
        const iconClass = `w-6 h-6 ${getIconColor()} flex-shrink-0`;
        
        switch (type) {
            case 'success':
                return (
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                );
            case 'error':
                return (
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                );
            case 'info':
                return (
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                );
            case 'warning':
                return (
                    <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                );
        }
    };

    return (
        <div 
            className={`
                fixed left-1/2 z-50 max-w-xs sm:max-w-sm w-auto min-w-0 mx-3 px-3 py-2.5
                bg-white border border-gray-200 rounded-lg shadow-lg
                transform transition-all duration-300 ease-out
                ${isAnimating 
                    ? 'bottom-4 -translate-x-1/2 translate-y-0 opacity-100 scale-100' 
                    : 'bottom-0 -translate-x-1/2 translate-y-full opacity-0 scale-95'
                }
            `}
            style={{ maxWidth: 'calc(100vw - 24px)' }}
        >
            <div className="flex items-center gap-2.5">
                {getIcon()}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-tight truncate">
                        {message}
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="flex-shrink-0 ml-1 p-0.5 rounded-full hover:bg-gray-100 transition-colors duration-200"
                >
                    <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Toast;
