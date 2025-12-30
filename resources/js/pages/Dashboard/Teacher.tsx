import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import TeacherDashboard from '@/pages/Dashboard/TeacherDashboard';
import { Head } from '@inertiajs/react';

interface Teacher {
    id: number;
    name: string;
    email: string;
    specialization?: string;
    assignedGroups: Array<{
        groupId: number;
        groupName: string;
        type: string;
        schedule: string;
    }>;
}

interface ScheduledClassItem {
    id: number;
    title: string;
    session_number: string;
    level: string;
    level_color: string;
    time?: string;
    date?: string;
    students: number;
    status?: string;
    meet_url?: string;
    total_students?: number;
    attended_students?: number;
    has_recording?: boolean;
}

interface Stats {
    totalClasses: number;
    scheduledClasses: number;
    inProgressClasses: number;
    completedClasses: number;
    totalStudents: number;
    todayClasses: number;
    pendingEvaluations: number;
}

interface Props {
    teacher: Teacher;
    stats?: Stats;
    todayClasses?: ScheduledClassItem[];
    upcomingClasses?: ScheduledClassItem[];
    recentClasses?: ScheduledClassItem[];
}

export default function TeacherPage({ teacher, stats, todayClasses, upcomingClasses, recentClasses }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Dashboard - Profesor" />
            <TeacherDashboard 
                teacher={teacher} 
                stats={stats}
                todayClasses={todayClasses}
                upcomingClasses={upcomingClasses}
                recentClasses={recentClasses}
            />
        </AuthenticatedLayout>
    );
}
