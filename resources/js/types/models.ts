export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar?: string;
  createdAt: Date;
}

export interface Student extends User {
  role: 'student';
  status: 'active' | 'inactive';
  classType: 'theoretical' | 'practical';
  assignedGroupId?: string;
  attendanceHistory: AttendanceRecord[];
  enrolledGroups: string[];
  level: 'basic' | 'intermediate' | 'advanced';
  points: number;
  badges: Badge[];
  certificates: Certificate[];
  prospectStatus?: 'registrado' | 'propuesta_enviada' | 'verificacion_pago' | 'matriculado';

  // Datos Personales Extendidos
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  phoneNumber?: string;
  gender?: string;
  birthDate?: string;
  documentType?: string;
  documentNumber?: string;
  educationLevel?: string;

  // Datos Académicos
  paymentDate?: string;
  enrollmentDate?: string;
  registrationDate?: string;
  enrollmentCode?: string;
  contractedPlan?: string;
  contractUrl?: string;
  contractFileName?: string;
  paymentVerified?: boolean;

  // Examen de Categorización
  hasPlacementTest?: boolean;
  testDate?: string;
  testScore?: string;

  // Datos del Apoderado/Titular
  guardianName?: string;
  guardianDocumentNumber?: string;
  guardianEmail?: string;
  guardianBirthDate?: string;
  guardianPhone?: string;
  guardianAddress?: string;
}

export interface Teacher extends User {
  role: 'teacher';
  status: 'active' | 'inactive';
  specialization: 'theoretical' | 'practical' | 'both';
  availableSchedule: TimeSlot[];
  assignedGroups: AssignedGroup[];
  assignedGroupIds: string[];
  
  // Datos Personales Extendidos
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  phoneNumber?: string;
  gender?: string;
  age?: number;
  birthDate?: string;
  documentType?: 'DNI' | 'CE';
  documentNumber?: string;
  educationLevel?: string;
  
  // Datos Laborales
  startDate?: string;
  bankAccount?: string;
  bank?: string;
  workModality?: string;
  languageLevel?: string;
  paymentDates?: string[];
  contractStatus?: 'contratado' | 'en_proceso' | 'finalizado';
  contractPeriod?: string;
  contractModality?: string;
  
  // Datos de Contacto
  currentAddress?: string;
  emergencyContactNumber?: string;
  emergencyContactRelationship?: string;
  emergencyContactName?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Group {
  id: string;
  name: string;
  type: 'theoretical' | 'practical';
  teacherId: string;
  teacherName?: string;
  studentIds: string[];
  maxCapacity: number; // 4 for theoretical, 6 for practical
  schedule: TimeSlot;
  status: 'active' | 'closed';
  level: 'basic' | 'intermediate' | 'advanced';
  startDate: Date;
  endDate: Date;
}

export interface TimeSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
}

export interface AssignedGroup {
  groupId: string;
  groupName: string;
  type: 'theoretical' | 'practical';
  schedule: TimeSlot;
}

export interface AttendanceRecord {
  classId: string;
  groupId: string;
  date: Date;
  attended: boolean;
  duration: number;
}

export interface Class {
  id: string;
  groupId: string;
  title: string;
  description: string;
  type: 'theoretical' | 'practical';
  videoUrl?: string;
  materials: Material[];
  evaluation?: Evaluation;
  order: number;
}

export interface Workshop {
  id: string;
  groupId: string;
  title: string;
  description: string;
  scheduledDate: Date;
  meetLink: string;
  maxParticipants: number;
  participants: string[];
  recordingUrl?: string;
  isLive: boolean;
}

export interface Evaluation {
  id: string;
  classId?: string;
  groupId: string;
  title: string;
  type: 'class' | 'topic' | 'final';
  skills: ('reading' | 'listening' | 'writing' | 'speaking')[];
  questions: Question[];
  passingScore: number;
  duration: number; // minutes
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'essay' | 'audio' | 'speaking';
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export interface Certificate {
  id: string;
  studentId: string;
  groupId: string;
  level: 'basic' | 'intermediate' | 'advanced';
  issuedDate: Date;
  certificateUrl: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  earnedDate?: Date;
}

export interface Forum {
  id: string;
  groupId: string;
  title: string;
  description: string;
  posts: ForumPost[];
  createdAt: Date;
}

export interface ForumPost {
  id: string;
  forumId: string;
  authorId: string;
  content: string;
  replies: ForumPost[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'audio' | 'video';
  url: string;
}

export interface Progress {
  studentId: string;
  groupId: string;
  classesCompleted: string[];
  evaluationsCompleted: string[];
  workshopsAttended: string[];
  overallProgress: number;
  currentLevel: string;
}