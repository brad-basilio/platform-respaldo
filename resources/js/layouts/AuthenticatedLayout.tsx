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
        if (path.includes('/admin/enrolled-students')) setActiveView('enrolled-students');
        else if (path.includes('/admin/students')) setActiveView('students');
        else if (path.includes('/admin/teachers')) setActiveView('teachers');
        else if (path.includes('/admin/groups')) setActiveView('groups');
        else if (path.includes('/admin/academic-levels')) setActiveView('academic-levels');
        else if (path.includes('/admin/payment-plans')) setActiveView('payment-plans');
        else if (path === '/dashboard') setActiveView('dashboard');
    }, []);

    return (
        <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col overflow-hidden">
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
            {/* Header fijo */}
            <Header />
            
            {/* Contenedor principal con Sidebar y contenido */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar scrolleable */}
                <Sidebar activeView={activeView} onViewChange={setActiveView} />
                
                {/* Contenido principal scrolleable */}
                <main className="flex-1 overflow-y-auto main-scroll">
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
