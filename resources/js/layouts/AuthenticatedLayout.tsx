import React, { ReactNode, useState, useEffect } from 'react';
import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';
import { Toaster } from 'sonner';
import DocumentConfirmationModal from '@/components/DocumentConfirmationModal';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

interface AuthenticatedLayoutProps {
    children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    const [activeView, setActiveView] = useState('dashboard');
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [hasPendingDocuments, setHasPendingDocuments] = useState(false);
    const { props } = usePage<any>();
    const isStudent = props.auth?.user?.role === 'student';
    
    // ✅ Obtener información del estudiante y su contrato
    const studentData = isStudent ? props.student : null;
    const hasUnsignedContract = studentData?.contract && !studentData.contract.accepted;

    const checkPendingDocuments = async () => {
        try {
            const response = await axios.get('/api/student/pending-documents');
            const pendingCount = response.data.count || 0;
            if (pendingCount > 0) {
                setHasPendingDocuments(true);
                setShowDocumentModal(true);
            }
        } catch (error) {
            console.error('Error checking pending documents:', error);
        }
    };

    const handleDocumentsConfirmed = () => {
        setHasPendingDocuments(false);
        setShowDocumentModal(false);
    };

    // Check for pending documents when layout mounts (only for students)
    useEffect(() => {
        if (isStudent) {
            void checkPendingDocuments();
        }
    }, [isStudent]);

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
        <div className="h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex overflow-hidden">
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

            {/* Sidebar ocupa todo el alto */}
            <Sidebar 
                activeView={activeView} 
                onViewChange={setActiveView}
                hasUnsignedContract={hasUnsignedContract}
            />

            {/* Contenedor de Header + Contenido */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header solo en el área de contenido */}
                <Header />

                {/* Contenido principal scrolleable */}
                <main className="flex-1 relative overflow-y-auto main-scroll bg-white">
                    {/* Wave SVG como marca de agua */}
                    <div className="absolute w-full h-full opacity-20 z-0 pointer-events-none" >
                        <img
                            src="/wave.svg"
                            alt=""
                            className="absolute top-0 right-0 w-auto h-40 object-contain transform "
                        />
                    </div>
                    <div className="relative z-10 animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>

            {/* Document Confirmation Modal for Students */}
            {isStudent && showDocumentModal && (
                <DocumentConfirmationModal
                    open={showDocumentModal}
                    onClose={() => setShowDocumentModal(false)}
                    onDocumentsConfirmed={handleDocumentsConfirmed}
                />
            )}
        </div>
    );
}
