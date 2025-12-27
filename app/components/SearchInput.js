'use client';

import { useState } from 'react';

const SearchInput = ({ onSearch, searchTerm, setSearchTerm, onClear }) => {
    return (
        <form onSubmit={onSearch} className="w-full">
            <div className="relative w-full">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.3-4.3"></path>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search for movies and TV series..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-black transition-all duration-200 hover:bg-gray-100 focus:bg-white"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            title="Clear search"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
};

export default SearchInput;
