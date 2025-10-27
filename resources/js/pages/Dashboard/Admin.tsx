import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import AdminDashboard from '@/pages/Dashboard/AdminDashboard';
import { type Admin } from '@/types/models';

interface Props {
    admin: Admin;
    stats?: {
        totalStudents: number;
        activeStudents: number;
        totalTeachers: number;
        activeTeachers: number;
        totalGroups: number;
        activeGroups: number;
    };
}

export default function Admin({ admin }: Props) {
    return (
        <AuthenticatedLayout>
            <AdminDashboard admin={admin} />
        </AuthenticatedLayout>
    );
}
