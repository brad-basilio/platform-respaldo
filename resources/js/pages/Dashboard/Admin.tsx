import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import AdminDashboard from '@/pages/Dashboard/AdminDashboard';
import { type Admin } from '@/types/models';

interface DailyData {
    date: string;
    prospectos: number;
    verificados: number;
}

interface DistributionData {
    name: string;
    value: number;
    color: string;
}

interface TopAdvisor {
    name: string;
    total: number;
}

interface Stats {
    totalStudents: number;
    activeStudents: number;
    totalTeachers: number;
    activeTeachers: number;
    totalGroups: number;
    activeGroups: number;
    totalProspects: number;
    registrados: number;
    propuestasEnviadas: number;
    pagosPorVerificar: number;
    matriculados: number;
    verificados: number;
    prospectosHoy: number;
    verificadosHoy: number;
    enProceso: number;
    totalUsers: number;
    admins: number;
    salesAdvisors: number;
    cashiers: number;
    verifiers: number;
}

interface Props {
    admin: Admin;
    stats: Stats;
    dailyStudents: DailyData[];
    prospectDistribution: DistributionData[];
    topSalesAdvisors: TopAdvisor[];
}

export default function Admin({ admin, stats, dailyStudents, prospectDistribution, topSalesAdvisors }: Props) {
    return (
        <AuthenticatedLayout>
            <AdminDashboard 
                admin={admin} 
                stats={stats}
                dailyStudents={dailyStudents}
                prospectDistribution={prospectDistribution}
                topSalesAdvisors={topSalesAdvisors}
            />
        </AuthenticatedLayout>
    );
}
