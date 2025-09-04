'use client';

import { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'success', duration = 4000) => {
        const id = Date.now() + Math.random();
        const newToast = { id, message, type, duration };
        
        setToasts(prev => [...prev, newToast]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const showSuccess = (message, duration) => showToast(message, 'success', duration);
    const showError = (message, duration) => showToast(message, 'error', duration);
    const showInfo = (message, duration) => showToast(message, 'info', duration);
    const showWarning = (message, duration) => showToast(message, 'warning', duration);

    return (
        <ToastContext.Provider value={{ 
            showToast, 
            showSuccess, 
            showError, 
            showInfo, 
            showWarning 
        }}>
            {children}
            {/* Toast container - positioned to allow bottom slide animations */}
            <div className="fixed inset-0 pointer-events-none z-50">
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto"
                        style={{
                            zIndex: 50 + index
                        }}
                    >
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            isVisible={true}
                            onClose={() => removeToast(toast.id)}
                            duration={toast.duration}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
