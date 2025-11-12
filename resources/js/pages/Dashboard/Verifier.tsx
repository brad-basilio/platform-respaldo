import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import VerifierDashboard from '@/pages/Dashboard/VerifierDashboard';
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

interface TopVerifier {
    name: string;
    total: number;
}

interface Stats {
    totalStudents: number;
    activeStudents: number;
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
    admin: Admin; // Reutilizamos el tipo Admin para verifier
    stats: Stats;
    dailyStudents: DailyData[];
    prospectDistribution: DistributionData[];
    topSalesAdvisors: TopVerifier[]; // Reutilizamos el slot para top verificadores
}

export default function Verifier({ admin, stats, dailyStudents, prospectDistribution, topSalesAdvisors }: Props) {
    return (
        <AuthenticatedLayout>
            <VerifierDashboard 
                admin={admin} 
                stats={stats}
                dailyStudents={dailyStudents}
                prospectDistribution={prospectDistribution}
                topSalesAdvisors={topSalesAdvisors}
            />
        </AuthenticatedLayout>
    );
}
