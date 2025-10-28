import React, { ReactNode, useState } from 'react';
import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';
import { Toaster } from 'sonner';

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const [activeView, setActiveView] = useState('dashboard');

    // Determine the active view based on the current route
    React.useEffect(() => {
        const path = window.location.pathname;
        if (path.includes('/admin/students')) setActiveView('students');
        else if (path.includes('/admin/teachers')) setActiveView('teachers');
        else if (path.includes('/admin/groups')) setActiveView('groups');
        else if (path === '/dashboard') setActiveView('dashboard');
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-x-hidden">
            <Toaster 
                position="top-right" 
                richColors 
                closeButton 
                toastOptions={{
                    style: {
                        fontSize: '14px',
                    },
                }}
            />
            <Header />
            <div className="flex overflow-x-hidden">
                <Sidebar activeView={activeView} onViewChange={setActiveView} />
                <main className="flex-1 min-h-screen overflow-x-hidden">
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
