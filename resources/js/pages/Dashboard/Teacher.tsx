import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import TeacherDashboard from '@/pages/Dashboard/TeacherDashboard';
import { type Teacher } from '@/types/models';

interface Props {
    teacher: Teacher;
}

export default function TeacherPage({ teacher }: Props) {
    return (
        <AuthenticatedLayout>
            <TeacherDashboard teacher={teacher} />
        </AuthenticatedLayout>
    );
}
