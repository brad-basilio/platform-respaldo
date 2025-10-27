import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import StudentDashboard from '@/pages/Dashboard/StudentDashboard';
import { type Student } from '@/types/models';

interface Props {
    student: Student;
}

export default function StudentPage({ student }: Props) {
    return (
        <AuthenticatedLayout>
            <StudentDashboard student={student} />
        </AuthenticatedLayout>
    );
}
