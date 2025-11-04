<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class VoucherVerificationController extends Controller
{
    /**
     * Display the voucher verification page for cashiers
     */
    public function index()
    {
        return Inertia::render('Admin/VoucherVerification');
    }
}
