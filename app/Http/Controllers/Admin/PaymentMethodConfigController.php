<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethodConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class PaymentMethodConfigController extends Controller
{
    /**
     * Obtener todos los métodos de pago configurados
     */
    public function index()
    {
        $yapes = PaymentMethodConfig::yape()->ordered()->get()->map(function ($method) {
            return [
                'id' => $method->id,
                'name' => $method->name,
                'description' => $method->description,
                'phone_number' => $method->phone_number,
                'qr_image_url' => $method->qr_image_url,
                'is_active' => $method->is_active,
                'display_order' => $method->display_order,
            ];
        });

        $transfers = PaymentMethodConfig::transfer()->ordered()->get()->map(function ($method) {
            return [
                'id' => $method->id,
                'name' => $method->name,
                'description' => $method->description,
                'bank_name' => $method->bank_name,
                'bank_logo_url' => $method->bank_logo_url,
                'account_holder' => $method->account_holder,
                'account_number' => $method->account_number,
                'cci' => $method->cci,
                'account_type' => $method->account_type,
                'is_active' => $method->is_active,
                'display_order' => $method->display_order,
            ];
        });

        return response()->json([
            'yapes' => $yapes,
            'transfers' => $transfers,
        ]);
    }

    /**
     * Crear un nuevo método de pago Yape
     */
    public function storeYape(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone_number' => 'required|string|max:20',
            'qr_image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Subir imagen QR
        $qrImagePath = null;
        if ($request->hasFile('qr_image')) {
            $qrImagePath = $request->file('qr_image')->store('payment_methods/yape', 'public');
        }

        $yape = PaymentMethodConfig::create([
            'type' => 'yape',
            'name' => $request->name,
            'description' => $request->description,
            'phone_number' => $request->phone_number,
            'qr_image_path' => $qrImagePath,
            'is_active' => $request->boolean('is_active', true),
            'display_order' => $request->integer('display_order', 0),
        ]);

        return response()->json([
            'message' => 'Método de pago Yape creado exitosamente',
            'yape' => [
                'id' => $yape->id,
                'name' => $yape->name,
                'description' => $yape->description,
                'phone_number' => $yape->phone_number,
                'qr_image_url' => $yape->qr_image_url,
                'is_active' => $yape->is_active,
                'display_order' => $yape->display_order,
            ],
        ], 201);
    }

    /**
     * Actualizar un método Yape
     */
    public function updateYape(Request $request, $id)
    {
        $yape = PaymentMethodConfig::findOrFail($id);

        if ($yape->type !== 'yape') {
            return response()->json(['error' => 'Este método no es de tipo Yape'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone_number' => 'required|string|max:20',
            'qr_image' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Actualizar imagen QR si se subió una nueva
        if ($request->hasFile('qr_image')) {
            // Eliminar imagen anterior
            if ($yape->qr_image_path) {
                Storage::disk('public')->delete($yape->qr_image_path);
            }
            $yape->qr_image_path = $request->file('qr_image')->store('payment_methods/yape', 'public');
        }

        $yape->update([
            'name' => $request->name,
            'description' => $request->description,
            'phone_number' => $request->phone_number,
            'is_active' => $request->boolean('is_active', true),
            'display_order' => $request->integer('display_order', 0),
        ]);

        return response()->json([
            'message' => 'Método de pago Yape actualizado exitosamente',
            'yape' => [
                'id' => $yape->id,
                'name' => $yape->name,
                'description' => $yape->description,
                'phone_number' => $yape->phone_number,
                'qr_image_url' => $yape->qr_image_url,
                'is_active' => $yape->is_active,
                'display_order' => $yape->display_order,
            ],
        ]);
    }

    /**
     * Crear un nuevo método de pago Transferencia
     */
    public function storeTransfer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'bank_name' => 'required|string|max:100',
            'bank_logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:1024',
            'account_holder' => 'required|string|max:255',
            'account_number' => 'required|string|max:50',
            'cci' => 'required|string|max:50',
            'account_type' => 'required|in:ahorros,corriente',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Subir logo del banco
        $bankLogoPath = null;
        if ($request->hasFile('bank_logo')) {
            $bankLogoPath = $request->file('bank_logo')->store('payment_methods/banks', 'public');
        }

        $transfer = PaymentMethodConfig::create([
            'type' => 'transfer',
            'name' => $request->name,
            'description' => $request->description,
            'bank_name' => $request->bank_name,
            'bank_logo_path' => $bankLogoPath,
            'account_holder' => $request->account_holder,
            'account_number' => $request->account_number,
            'cci' => $request->cci,
            'account_type' => $request->account_type,
            'is_active' => $request->boolean('is_active', true),
            'display_order' => $request->integer('display_order', 0),
        ]);

        return response()->json([
            'message' => 'Método de pago Transferencia creado exitosamente',
            'transfer' => [
                'id' => $transfer->id,
                'name' => $transfer->name,
                'description' => $transfer->description,
                'bank_name' => $transfer->bank_name,
                'bank_logo_url' => $transfer->bank_logo_url,
                'account_holder' => $transfer->account_holder,
                'account_number' => $transfer->account_number,
                'cci' => $transfer->cci,
                'account_type' => $transfer->account_type,
                'is_active' => $transfer->is_active,
                'display_order' => $transfer->display_order,
            ],
        ], 201);
    }

    /**
     * Actualizar un método Transferencia
     */
    public function updateTransfer(Request $request, $id)
    {
        $transfer = PaymentMethodConfig::findOrFail($id);

        if ($transfer->type !== 'transfer') {
            return response()->json(['error' => 'Este método no es de tipo Transferencia'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'bank_name' => 'required|string|max:100',
            'bank_logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:1024',
            'account_holder' => 'required|string|max:255',
            'account_number' => 'required|string|max:50',
            'cci' => 'required|string|max:50',
            'account_type' => 'required|in:ahorros,corriente',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Actualizar logo del banco si se subió uno nuevo
        if ($request->hasFile('bank_logo')) {
            // Eliminar logo anterior
            if ($transfer->bank_logo_path) {
                Storage::disk('public')->delete($transfer->bank_logo_path);
            }
            $transfer->bank_logo_path = $request->file('bank_logo')->store('payment_methods/banks', 'public');
        }

        $transfer->update([
            'name' => $request->name,
            'description' => $request->description,
            'bank_name' => $request->bank_name,
            'account_holder' => $request->account_holder,
            'account_number' => $request->account_number,
            'cci' => $request->cci,
            'account_type' => $request->account_type,
            'is_active' => $request->boolean('is_active', true),
            'display_order' => $request->integer('display_order', 0),
        ]);

        return response()->json([
            'message' => 'Método de pago Transferencia actualizado exitosamente',
            'transfer' => [
                'id' => $transfer->id,
                'name' => $transfer->name,
                'description' => $transfer->description,
                'bank_name' => $transfer->bank_name,
                'bank_logo_url' => $transfer->bank_logo_url,
                'account_holder' => $transfer->account_holder,
                'account_number' => $transfer->account_number,
                'cci' => $transfer->cci,
                'account_type' => $transfer->account_type,
                'is_active' => $transfer->is_active,
                'display_order' => $transfer->display_order,
            ],
        ]);
    }

    /**
     * Eliminar un método de pago
     */
    public function destroy($id)
    {
        $method = PaymentMethodConfig::findOrFail($id);

        // Eliminar archivos asociados
        if ($method->qr_image_path) {
            Storage::disk('public')->delete($method->qr_image_path);
        }
        if ($method->bank_logo_path) {
            Storage::disk('public')->delete($method->bank_logo_path);
        }

        $method->delete();

        return response()->json([
            'message' => 'Método de pago eliminado exitosamente',
        ]);
    }

    /**
     * Obtener métodos de pago activos para estudiantes
     */
    public function getActiveForStudents()
    {
        $yapes = PaymentMethodConfig::yape()->active()->ordered()->get()->map(function ($method) {
            return [
                'id' => $method->id,
                'name' => $method->name,
                'description' => $method->description,
                'phone_number' => $method->phone_number,
                'qr_image_url' => $method->qr_image_url,
            ];
        });

        $transfers = PaymentMethodConfig::transfer()->active()->ordered()->get()->map(function ($method) {
            return [
                'id' => $method->id,
                'name' => $method->name,
                'description' => $method->description,
                'bank_name' => $method->bank_name,
                'bank_logo_url' => $method->bank_logo_url,
                'account_holder' => $method->account_holder,
                'account_number' => $method->account_number,
                'cci' => $method->cci,
                'account_type' => $method->account_type,
            ];
        });

        return response()->json([
            'yapes' => $yapes,
            'transfers' => $transfers,
        ]);
    }
}
