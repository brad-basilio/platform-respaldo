export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student' | 'sales_advisor' | 'cashier' | 'verifier';
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
  
  // ✅ Campos actualizados
  academicLevelId?: number;  // Nuevo: ID del nivel académico
  academicLevel?: {          // Nuevo: Relación con AcademicLevel
    id: number;
    name: string;
    code: string;
    color: string;
  };
  
  paymentPlanId?: number;    // Nuevo: ID del plan de pago
  paymentPlan?: {            // Nuevo: Relación con PaymentPlan
    id: number;
    name: string;
    installments_count: number;
    monthly_amount: number;
    total_amount: number;
  };
  
  points: number;
  badges: Badge[];
  certificates: Certificate[];
  prospectStatus?: 'registrado' | 'propuesta_enviada' | 'pago_por_verificar' | 'matriculado';

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
  contractUrl?: string;
  contractFileName?: string;
  paymentVoucherUrl?: string;      // ✅ Nuevo: URL del voucher de pago
  paymentVoucherFileName?: string; // ✅ Nuevo: Nombre del archivo del voucher
  paymentVerified?: boolean;
  contractedPlan?: string;         // ✅ Plan contratado (texto)
  level?: string;                  // ✅ Nivel académico (texto)

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

  // Origen y Referencia
  source?: 'frio' | 'referido' | 'lead';
  referredBy?: number;  // ✅ Cambiado de string a number (es el ID del estudiante)
  referredByStudent?: {
    id: string;
    name: string;
    email: string;
  };

  // Clase Modelo y Archivado
  hadDemoClass?: boolean;  // ✅ Nuevo: si tuvo clase modelo
  archived?: boolean;  // ✅ Nuevo: si fue archivado
  archivedAt?: string;  // ✅ Nuevo: cuándo fue archivado
  archivedReason?: string;  // ✅ Nuevo: razón del archivo

  // Datos de Registro
  registeredBy?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  
  // Datos de Verificación de Pago
  verifiedPaymentBy?: {
    id: string;
    name: string;
    email: string;
  };
  paymentVerifiedAt?: string;
  
  // Datos de Verificación de Matrícula
  verifiedEnrollmentBy?: {
    id: string;
    name: string;
    email: string;
  };
  enrollmentVerifiedAt?: string;
  enrollmentVerified?: boolean; // Control anti-fraude para comisiones
  
  // Matrícula activa
  enrollment?: Enrollment;
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

// ✅ Nuevas interfaces para el sistema de niveles y planes de pago
export interface AcademicLevel {
  id: number;
  name: string;
  code: string;
  description?: string;
  order: number;
  color: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentPlan {
  id: number;
  name: string;
  academic_level_id?: number;  // Ahora es opcional - el plan no está amarrado a un nivel
  academicLevel?: AcademicLevel;
  installments_count: number;
  monthly_amount: number;
  total_amount: number;
  discount_percentage: number;
  duration_months: number;
  late_fee_percentage: number;
  grace_period_days: number;
  is_active: boolean;
  description?: string;
  students_count?: number;
  created_at?: string;
  updated_at?: string;
}

// ✅ Sistema de Matrículas y Cuotas
export interface Enrollment {
  id: number;
  student_id: string;
  student?: Student;
  payment_plan_id: number;
  paymentPlan?: PaymentPlan;
  enrollment_fee: number;
  enrollment_voucher_path?: string;
  enrollment_voucher_url?: string;
  enrollment_fee_verified?: boolean; // ✅ Añadido: verificación de cuota de matrícula
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  notes?: string;
  verified_by?: string;
  verifiedBy?: {
    id: string;
    name: string;
    email: string;
  };
  verified_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  installments?: Installment[];
  
  // Atributos calculados
  totalPaid?: number;
  totalPending?: number;
  paymentProgress?: number;
}

export interface Installment {
  id: number;
  enrollment_id: number;
  enrollment?: Enrollment;
  installment_number: number;
  due_date: string;
  amount: number;
  late_fee: number;
  paid_amount: number;
  status: 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled';
  notes?: string;
  verified_by?: string;
  verifiedBy?: {
    id: string;
    name: string;
    email: string;
  };
  verified_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  vouchers?: InstallmentVoucher[];
  
  // Atributos calculados
  totalDue?: number;
  isOverdue?: boolean;
  daysLate?: number;
}

export interface InstallmentVoucher {
  id: number;
  installment_id: number;
  installment?: Installment;
  voucher_path: string;
  voucher_url?: string;
  declared_amount: number;
  payment_date: string;
  payment_method: 'cash' | 'transfer' | 'deposit' | 'card';
  transaction_reference?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  };
  reviewed_at?: string;
  rejection_reason?: string;
  uploaded_by: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}