import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';

export default function Analytics() {
    return (
        <AuthenticatedLayout>
            <div className="p-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-6">Estadísticas</h1>
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                    <p className="text-slate-600">Módulo de estadísticas en desarrollo...</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
