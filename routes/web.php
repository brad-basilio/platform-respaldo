<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\AcademicLevelController;
use App\Http\Controllers\PaymentPlanController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\InstallmentController;
use App\Http\Controllers\InstallmentVoucherController;
use App\Http\Controllers\VoucherVerificationController;
use App\Http\Controllers\Student\StudentPaymentController;
use App\Http\Controllers\CashierController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\Admin\ContractApprovalController;
use App\Http\Controllers\Admin\ClassTemplateController;
use App\Http\Controllers\Admin\ScheduledClassController;
use App\Http\Controllers\Admin\ClassRequestController as AdminClassRequestController;
use App\Http\Controllers\Student\StudentClassController;
use App\Http\Controllers\Student\ClassRequestController as StudentClassRequestController;
use App\Http\Controllers\Api\ImageUploadController;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // ========================================
    // PROFILE - Accessible to all authenticated users
    // ========================================
    Route::post('/profile/update-avatar', [ProfileController::class, 'updateAvatar'])->name('profile.update-avatar');
    
    // ========================================
    // NOTIFICATIONS - Accessible to all authenticated users
    // ========================================
    Route::get('/api/notifications', function () {
        $user = Auth::user();
        return response()->json([
            'notifications' => $user->notifications()->latest()->limit(20)->get(),
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    })->name('api.notifications');
    
    Route::post('/api/notifications/{id}/mark-as-read', function ($id) {
        Auth::user()->notifications()->findOrFail($id)->markAsRead();
        return response()->json(['success' => true]);
    })->name('api.notifications.mark-as-read');
    
    Route::post('/api/notifications/mark-all-as-read', function () {
        Auth::user()->unreadNotifications->markAsRead();
        return response()->json(['success' => true]);
    })->name('api.notifications.mark-all-as-read');
    
    // ========================================
    // Student/Prospect Management (accessible by admin, sales_advisor, cashier)
    // ========================================
    Route::middleware('prospect.access')->group(function () {
        Route::get('/admin/students', [StudentController::class, 'index'])->name('admin.students');
        Route::get('/api/admin/students', [StudentController::class, 'getStudentsJson'])->name('api.admin.students');
        Route::post('/admin/students', [StudentController::class, 'store'])->name('admin.students.store');
        Route::put('/admin/students/{student}', [StudentController::class, 'update'])->name('admin.students.update');
        Route::delete('/admin/students/{student}', [StudentController::class, 'destroy'])->name('admin.students.destroy');
        Route::put('/admin/students/{student}/prospect-status', [StudentController::class, 'updateProspectStatus'])->name('admin.students.prospect-status');
        Route::get('/admin/students/{student}/contract', [StudentController::class, 'downloadContract'])->name('admin.students.contract');
        Route::get('/admin/students/{student}/payment-voucher', [StudentController::class, 'viewPaymentVoucher'])->name('admin.students.payment-voucher');
        
        // Contract Approval Routes
        Route::get('/admin/contracts/{contractAcceptance}', [ContractApprovalController::class, 'show'])->name('admin.contracts.show');
        // ⚠️ COMENTADO: Rutas de aprobación y rechazo de contratos por el advisor
        // Ahora el contrato pasa automáticamente a "pago_por_verificar" cuando el estudiante firma
        // Estas rutas se mantienen comentadas para uso futuro
        
        // Route::post('/admin/contracts/{contractAcceptance}/approve', [ContractApprovalController::class, 'approve'])->name('admin.contracts.approve');
        // Route::post('/admin/contracts/{contractAcceptance}/resend', [ContractApprovalController::class, 'resend'])->name('admin.contracts.resend');
        
        // Enrollments & Payment Schedules
        Route::get('/api/students/{student}/enrollment', [EnrollmentController::class, 'show'])->name('api.students.enrollment');
        Route::post('/api/enrollments', [EnrollmentController::class, 'store'])->name('api.enrollments.store');
        Route::put('/api/enrollments/{enrollment}', [EnrollmentController::class, 'update'])->name('api.enrollments.update');
        
        // Installments (Cuotas)
        Route::get('/api/enrollments/{enrollment}/installments', [InstallmentController::class, 'index'])->name('api.enrollments.installments');
        Route::get('/api/installments/{installment}', [InstallmentController::class, 'show'])->name('api.installments.show');
        Route::put('/api/installments/{installment}', [InstallmentController::class, 'update'])->name('api.installments.update');
        Route::post('/api/installments/{installment}/verify', [InstallmentController::class, 'verify'])->name('api.installments.verify');
        Route::post('/api/enrollments/{enrollment}/recalculate-late-fees', [InstallmentController::class, 'recalculateLateFees'])->name('api.enrollments.recalculate-late-fees');
        
        // Installment Vouchers (Vouchers de Cuotas)
        Route::post('/api/installments/{installment}/vouchers', [InstallmentVoucherController::class, 'store'])->name('api.installments.vouchers.store');
        Route::get('/api/vouchers/{voucher}', [InstallmentVoucherController::class, 'show'])->name('api.vouchers.show');
        Route::post('/api/vouchers/{voucher}/approve', [InstallmentVoucherController::class, 'approve'])->name('api.vouchers.approve');
        Route::post('/api/vouchers/{voucher}/reject', [InstallmentVoucherController::class, 'reject'])->name('api.vouchers.reject');
        Route::get('/api/vouchers/pending', [InstallmentVoucherController::class, 'pending'])->name('api.vouchers.pending');
        
        // Voucher Verification Page (for cashiers)
        Route::get('/admin/voucher-verification', [VoucherVerificationController::class, 'index'])->name('admin.voucher-verification');
    });
      // Input Demo
        Route::get('/admin/input-demo', function () {
            return inertia('Admin/InputDemo');
        })->name('admin.input-demo');
        
    
    // Admin and Verifier routes (enrolled students & payment control)
    Route::middleware('admin.or.verifier')->group(function () {
        // Enrolled Students
        Route::get('/admin/enrolled-students', [StudentController::class, 'enrolledStudents'])->name('admin.enrolled-students');
        Route::post('/admin/students/{student}/verify-enrollment', [StudentController::class, 'verifyEnrollment'])->name('admin.students.verify-enrollment');
        Route::post('/admin/students/{student}/unverify-enrollment', [StudentController::class, 'unverifyEnrollment'])->name('admin.students.unverify-enrollment');
        Route::patch('/admin/students/{student}/toggle-regular-status', [StudentController::class, 'toggleRegularStatus'])->name('admin.students.toggle-regular-status');
        Route::get('/admin/students/{student}/enrollment-documents', [StudentController::class, 'getEnrollmentDocuments'])->name('admin.students.enrollment-documents');
        Route::post('/admin/students/{student}/resend-contract-email', [StudentController::class, 'resendContractEmail'])->name('admin.students.resend-contract-email');
        Route::get('/admin/students/{student}/payment-schedule', [StudentController::class, 'downloadPaymentSchedule'])->name('admin.students.payment-schedule');
        
        // Admin Payment Control
        Route::get('/admin/payment-control', [CashierController::class, 'adminPaymentControl'])->name('admin.payment-control');
        Route::get('/admin/students/{student}/enrollment', [CashierController::class, 'getStudentEnrollment'])->name('admin.students.enrollment');
    });
    
    // Admin-only routes
    Route::middleware('can:admin')->group(function () {
      
        // User Management (sales_advisor, cashier, verifier)
        Route::get('/admin/users', [UserController::class, 'index'])->name('admin.users');
        Route::post('/admin/users', [UserController::class, 'store'])->name('admin.users.store');
        Route::put('/admin/users/{user}', [UserController::class, 'update'])->name('admin.users.update');
        Route::delete('/admin/users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
        
        // Settings Management
        Route::get('/admin/settings', [SettingController::class, 'index'])->name('admin.settings');
        Route::post('/admin/settings', [SettingController::class, 'update'])->name('admin.settings.update');
        Route::post('/admin/settings/single', [SettingController::class, 'updateSingle'])->name('admin.settings.update-single');
        
        // Image upload for TinyMCE editor
        Route::post('/admin/upload-image', [\App\Http\Controllers\ImageUploadController::class, 'upload'])->name('admin.upload-image');
        
        // Settings API for contract template and email templates
        Route::post('/api/admin/settings/general', [\App\Http\Controllers\Admin\SettingsController::class, 'saveGeneralSetting'])->name('api.admin.settings.general');
        Route::get('/api/admin/settings/general', [\App\Http\Controllers\Admin\SettingsController::class, 'getGeneralSetting'])->name('api.admin.settings.general.get');
        
        // Payment Method Configuration (Yape y Transferencias)
        Route::get('/api/admin/payment-methods', [\App\Http\Controllers\Admin\PaymentMethodConfigController::class, 'index'])->name('api.admin.payment-methods');
        Route::post('/api/admin/payment-methods/yape', [\App\Http\Controllers\Admin\PaymentMethodConfigController::class, 'storeYape'])->name('api.admin.payment-methods.yape.store');
        Route::post('/api/admin/payment-methods/yape/{id}', [\App\Http\Controllers\Admin\PaymentMethodConfigController::class, 'updateYape'])->name('api.admin.payment-methods.yape.update');
        Route::post('/api/admin/payment-methods/transfer', [\App\Http\Controllers\Admin\PaymentMethodConfigController::class, 'storeTransfer'])->name('api.admin.payment-methods.transfer.store');
        Route::post('/api/admin/payment-methods/transfer/{id}', [\App\Http\Controllers\Admin\PaymentMethodConfigController::class, 'updateTransfer'])->name('api.admin.payment-methods.transfer.update');
        Route::delete('/api/admin/payment-methods/{id}', [\App\Http\Controllers\Admin\PaymentMethodConfigController::class, 'destroy'])->name('api.admin.payment-methods.destroy');
        
        // Academic Levels Management
        Route::resource('admin/academic-levels', AcademicLevelController::class)
            ->except(['show', 'create', 'edit'])
            ->names([
                'index' => 'admin.academic-levels.index',
                'store' => 'admin.academic-levels.store',
                'update' => 'admin.academic-levels.update',
                'destroy' => 'admin.academic-levels.destroy',
            ]);
        Route::get('/api/admin/academic-levels', [AcademicLevelController::class, 'getAcademicLevelsJson'])->name('api.admin.academic-levels');
        
        // Payment Plans Management
        Route::resource('admin/payment-plans', PaymentPlanController::class)
            ->except(['show', 'create', 'edit'])
            ->names([
                'index' => 'admin.payment-plans.index',
                'store' => 'admin.payment-plans.store',
                'update' => 'admin.payment-plans.update',
                'destroy' => 'admin.payment-plans.destroy',
            ]);
        Route::get('/api/admin/payment-plans', [PaymentPlanController::class, 'getPaymentPlansJson'])->name('api.admin.payment-plans');
        
        // Document Types Management
        Route::get('/admin/document-types', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'indexPage'])->name('admin.document-types');
        Route::get('/admin/document-types/active', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'active'])->name('admin.document-types.active');
        Route::post('/admin/document-types/reorder', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'reorder'])->name('admin.document-types.reorder');
        Route::resource('admin/document-types', \App\Http\Controllers\Admin\DocumentTypeController::class)
            ->except(['show', 'create', 'edit', 'index'])
            ->names([
                'store' => 'admin.document-types.store',
                'update' => 'admin.document-types.update',
                'destroy' => 'admin.document-types.destroy',
            ]);
        Route::post('/admin/document-types/{id}/toggle-active', [\App\Http\Controllers\Admin\DocumentTypeController::class, 'toggleActive'])->name('admin.document-types.toggle-active');
        
        // Enrollments & Installments (Admin only)
        Route::get('/api/admin/enrollments', [EnrollmentController::class, 'index'])->name('api.admin.enrollments');
        Route::get('/api/admin/installments/overdue', [InstallmentController::class, 'overdueInstallments'])->name('api.admin.installments.overdue');
        
        // Teacher Management
        Route::get('/admin/teachers', [TeacherController::class, 'index'])->name('admin.teachers');
        Route::post('/admin/teachers', [TeacherController::class, 'store'])->name('admin.teachers.store');
        Route::put('/admin/teachers/{teacher}', [TeacherController::class, 'update'])->name('admin.teachers.update');
        Route::delete('/admin/teachers/{teacher}', [TeacherController::class, 'destroy'])->name('admin.teachers.destroy');
        
        // Group Management
        Route::get('/admin/groups', [GroupController::class, 'index'])->name('admin.groups');
        Route::post('/admin/groups', [GroupController::class, 'store'])->name('admin.groups.store');
        Route::put('/admin/groups/{group}', [GroupController::class, 'update'])->name('admin.groups.update');
        Route::delete('/admin/groups/{group}', [GroupController::class, 'destroy'])->name('admin.groups.destroy');
        
        // ========================================
        // CLASS TEMPLATES - Plantillas de Clases
        // ========================================
        Route::resource('admin/class-templates', ClassTemplateController::class)->names([
            'index' => 'admin.class-templates.index',
            'create' => 'admin.class-templates.create',
            'store' => 'admin.class-templates.store',
            'show' => 'admin.class-templates.show',
            'edit' => 'admin.class-templates.edit',
            'update' => 'admin.class-templates.update',
            'destroy' => 'admin.class-templates.destroy',
        ]);
        Route::post('/admin/class-templates/{classTemplate}/duplicate', [ClassTemplateController::class, 'duplicate'])->name('admin.class-templates.duplicate');
        Route::get('/api/admin/class-templates', [ClassTemplateController::class, 'getTemplatesJson'])->name('api.admin.class-templates');
        
        // Class Template Questions
        Route::post('/admin/class-templates/{classTemplate}/questions', [ClassTemplateController::class, 'addQuestion'])->name('admin.class-templates.questions.store');
        Route::put('/admin/class-templates/{classTemplate}/questions/{question}', [ClassTemplateController::class, 'updateQuestion'])->name('admin.class-templates.questions.update');
        Route::delete('/admin/class-templates/{classTemplate}/questions/{question}', [ClassTemplateController::class, 'deleteQuestion'])->name('admin.class-templates.questions.destroy');
        
        // Class Template Resources
        Route::post('/admin/class-templates/{classTemplate}/resources', [ClassTemplateController::class, 'uploadResource'])->name('admin.class-templates.resources.store');
        Route::delete('/admin/class-templates/{classTemplate}/resources/{resource}', [ClassTemplateController::class, 'deleteResource'])->name('admin.class-templates.resources.destroy');
        
        // Editor Image Upload (for rich text editor)
        Route::post('/api/upload-image', [ImageUploadController::class, 'upload'])->name('api.upload-image');
        
        // ========================================
        // SCHEDULED CLASSES - Clases Programadas
        // ========================================
        Route::resource('admin/scheduled-classes', ScheduledClassController::class)->names([
            'index' => 'admin.scheduled-classes.index',
            'store' => 'admin.scheduled-classes.store',
            'show' => 'admin.scheduled-classes.show',
            'update' => 'admin.scheduled-classes.update',
            'destroy' => 'admin.scheduled-classes.destroy',
        ])->except(['create', 'edit']);
        Route::get('/api/admin/scheduled-classes/calendar', [ScheduledClassController::class, 'calendar'])->name('api.admin.scheduled-classes.calendar');
        Route::post('/admin/scheduled-classes/{scheduledClass}/enroll', [ScheduledClassController::class, 'enrollStudent'])->name('admin.scheduled-classes.enroll');
        Route::delete('/admin/scheduled-classes/{scheduledClass}/unenroll/{student}', [ScheduledClassController::class, 'unenrollStudent'])->name('admin.scheduled-classes.unenroll');
        Route::put('/admin/scheduled-classes/{scheduledClass}/status', [ScheduledClassController::class, 'updateStatus'])->name('admin.scheduled-classes.status');
        Route::post('/admin/scheduled-classes/{scheduledClass}/recording', [ScheduledClassController::class, 'addRecording'])->name('admin.scheduled-classes.recording');
        Route::get('/api/admin/scheduled-classes/{scheduledClass}/available-students', [ScheduledClassController::class, 'getAvailableStudents'])->name('api.admin.scheduled-classes.available-students');
        
        // ========================================
        // CLASS REQUESTS - Solicitudes de Clases
        // ========================================
        Route::get('/admin/class-requests', [AdminClassRequestController::class, 'index'])->name('admin.class-requests.index');
        Route::post('/admin/class-requests/{classRequest}/approve', [AdminClassRequestController::class, 'approve'])->name('admin.class-requests.approve');
        Route::post('/admin/class-requests/{classRequest}/reject', [AdminClassRequestController::class, 'reject'])->name('admin.class-requests.reject');
        Route::post('/admin/class-requests/{classRequest}/schedule', [AdminClassRequestController::class, 'schedule'])->name('admin.class-requests.schedule');
        Route::post('/admin/class-requests/{classRequest}/assign-existing', [AdminClassRequestController::class, 'assignToExisting'])->name('admin.class-requests.assign-existing');
        Route::get('/api/admin/class-templates/{template}/available-classes', [AdminClassRequestController::class, 'getAvailableClasses'])->name('api.admin.class-templates.available-classes');
        
        // Payments
        Route::get('/admin/payments', function () {
            return inertia('Admin/Payments');
        })->name('admin.payments');
        
        // Analytics
        Route::get('/admin/analytics', function () {
            return inertia('Admin/Analytics');
        })->name('admin.analytics');
    });
    
    // Sales Advisor routes
    Route::middleware('can:sales_advisor')->group(function () {
        Route::get('/sales-advisor/enrolled-students', [StudentController::class, 'salesAdvisorEnrolledStudents'])->name('sales-advisor.enrolled-students');
        Route::get('/sales-advisor/archived-students', [StudentController::class, 'salesAdvisorArchivedStudents'])->name('sales-advisor.archived-students');
    });
    
    // Settings
    Route::get('/settings', function () {
        return inertia('settings/index');
    })->name('settings');
    
    // Student routes
    Route::middleware('can:student')->group(function () {
        Route::get('/student/payment-control', function () {
            return inertia('Student/PaymentControl');
        })->name('student.payment-control');
        
        // Nuevas rutas para las secciones del panel del alumno
        Route::get('/student/billing', function () {
            return inertia('Student/Billing');
        })->name('student.billing');
        
        Route::get('/student/my-plan', function () {
            return inertia('Student/MyPlan');
        })->name('student.my-plan');
        
        Route::get('/student/payment-methods', function () {
            return inertia('Student/PaymentMethods');
        })->name('student.payment-methods');
        
        // Contract routes
        Route::get('/contract/accept/{token}', [ContractController::class, 'view'])->name('contract.view');
        Route::post('/contract/accept/{token}', [ContractController::class, 'accept'])->name('contract.accept');
        
        Route::get('/api/student/enrollment', [StudentPaymentController::class, 'getEnrollment'])->name('api.student.enrollment');
        Route::post('/api/student/upload-voucher', [StudentPaymentController::class, 'uploadVoucher'])->name('api.student.upload-voucher');
        Route::post('/api/student/vouchers/{voucher}/replace', [StudentPaymentController::class, 'replaceVoucher'])->name('api.student.replace-voucher');
        
        // Plan de pago
        Route::get('/api/student/can-change-plan', [StudentPaymentController::class, 'canChangePlan'])->name('api.student.can-change-plan');
        Route::post('/api/student/change-plan', [StudentPaymentController::class, 'changePlan'])->name('api.student.change-plan');
        Route::get('/api/student/available-plans', [StudentPaymentController::class, 'getAvailablePlans'])->name('api.student.available-plans');
        
        // Payment Methods (Tarjetas)
        Route::get('/api/student/payment-methods', [\App\Http\Controllers\Student\PaymentMethodController::class, 'index'])->name('api.student.payment-methods.index');
        Route::post('/api/student/payment-methods', [\App\Http\Controllers\Student\PaymentMethodController::class, 'store'])->name('api.student.payment-methods.store');
        Route::put('/api/student/payment-methods/{paymentMethod}', [\App\Http\Controllers\Student\PaymentMethodController::class, 'update'])->name('api.student.payment-methods.update');
        Route::delete('/api/student/payment-methods/{paymentMethod}', [\App\Http\Controllers\Student\PaymentMethodController::class, 'destroy'])->name('api.student.payment-methods.destroy');
        
        // Culqi Payments
        Route::post('/api/student/culqi/process-payment', [\App\Http\Controllers\Student\CulqiPaymentController::class, 'processPayment'])->name('api.student.culqi.process-payment');
        Route::post('/api/student/culqi/process-payment-saved-card', [\App\Http\Controllers\Student\CulqiPaymentController::class, 'processPaymentWithSavedCard'])->name('api.student.culqi.process-payment-saved-card');
        Route::get('/api/student/culqi/public-key', [\App\Http\Controllers\Student\CulqiPaymentController::class, 'getPublicKey'])->name('api.student.culqi.public-key');
        
        // Payment Method Configurations (Yape y Transferencias) - Para estudiantes
        Route::get('/api/student/active-payment-methods', [\App\Http\Controllers\Admin\PaymentMethodConfigController::class, 'getActiveForStudents'])->name('api.student.active-payment-methods');
        
        // Enrollment documents
        Route::get('/api/student/pending-documents', [StudentController::class, 'getPendingDocuments'])->name('api.student.pending-documents');
        Route::get('/api/student/all-documents', [StudentController::class, 'getAllDocuments'])->name('api.student.all-documents');
        Route::post('/api/student/documents/{document}/confirm', [StudentController::class, 'confirmDocument'])->name('api.student.confirm-document');
        
        // Student Classes (Mis Clases)
        Route::get('/student/my-classes', [StudentClassRequestController::class, 'index'])->name('student.my-classes');
        Route::get('/student/class-templates/{template}', [StudentClassRequestController::class, 'show'])->name('student.class-templates.show');
        Route::post('/student/class-requests', [StudentClassRequestController::class, 'store'])->name('student.class-requests.store');
        Route::delete('/student/class-requests/{classRequest}', [StudentClassRequestController::class, 'destroy'])->name('student.class-requests.destroy');
        
        // Class config and available classes for regular students
        Route::get('/api/student/class-config', [StudentClassRequestController::class, 'getClassConfig'])->name('api.student.class-config');
        Route::get('/api/student/available-classes/{template}', [StudentClassRequestController::class, 'getAvailableClasses'])->name('api.student.available-classes');
        
        // Class Enrollments (ver clase inscrita)
        Route::get('/student/class-enrollments/{enrollment}', [StudentClassController::class, 'show'])->name('student.class-enrollments.show');
        Route::post('/student/class-enrollments/{enrollment}/submit-exam', [StudentClassController::class, 'submitExam'])->name('student.class-enrollments.submit-exam');
        
        // Public settings endpoint (no requiere autenticación)
        Route::get('/api/settings/{key}', function ($key) {
            $setting = \App\Models\Setting::where('key', $key)->first();
            return response()->json([
                'success' => true,
                'key' => $key,
                'content' => $setting ? $setting->content : null,
            ]);
        })->withoutMiddleware(['auth', 'verified']);
    });
    
    // Cashier routes
    Route::middleware('can:cashier')->group(function () {
        Route::get('/cashier/payment-control', [CashierController::class, 'paymentControl'])->name('cashier.payment-control');
        Route::get('/cashier/payment-reports', [CashierController::class, 'paymentReports'])->name('cashier.payment-reports');
        Route::get('/cashier/students/{student}/enrollment', [CashierController::class, 'getStudentEnrollment'])->name('cashier.students.enrollment');
        Route::post('/cashier/vouchers/{voucher}/verify', [CashierController::class, 'verifyVoucher'])->name('cashier.vouchers.verify');
    });
});

require __DIR__.'/settings.php';