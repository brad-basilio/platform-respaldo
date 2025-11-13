<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class DocumentTypeController extends Controller
{
    /**
     * Mostrar la página de gestión de tipos de documentos
     */
    public function indexPage()
    {
        $types = DocumentType::ordered()->get();
        
        return Inertia::render('Admin/DocumentTypes', [
            'documentTypes' => $types
        ]);
    }

    /**
     * Obtener todos los tipos de documentos activos (para usar en formularios)
     */
    public function active()
    {
        $types = DocumentType::active()
            ->ordered()
            ->get(['id', 'name', 'code', 'description']);

        return response()->json($types);
    }

    /**
     * Obtener todos los tipos de documentos (para administración)
     */
    public function index()
    {
        $types = DocumentType::ordered()->get();
        return response()->json($types);
    }

    /**
     * Crear un nuevo tipo de documento
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:document_types,code',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Generar sort_order automáticamente (último + 1)
        $lastOrder = DocumentType::max('sort_order') ?? 0;

        $documentType = DocumentType::create([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'is_active' => $request->is_active ?? true,
            'sort_order' => $lastOrder + 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tipo de documento creado exitosamente',
            'document_type' => $documentType
        ]);
    }

    /**
     * Actualizar un tipo de documento existente
     */
    public function update(Request $request, $id)
    {
        $documentType = DocumentType::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:document_types,code,' . $id,
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $documentType->update([
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description,
            'is_active' => $request->is_active ?? $documentType->is_active,
            // sort_order no se modifica en la edición
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tipo de documento actualizado exitosamente',
            'document_type' => $documentType
        ]);
    }

    /**
     * Alternar el estado activo/inactivo
     */
    public function toggleActive($id)
    {
        $documentType = DocumentType::findOrFail($id);
        $documentType->is_active = !$documentType->is_active;
        $documentType->save();

        return response()->json([
            'success' => true,
            'message' => 'Estado actualizado exitosamente',
            'document_type' => $documentType
        ]);
    }

    /**
     * Eliminar un tipo de documento
     */
    public function destroy($id)
    {
        $documentType = DocumentType::findOrFail($id);
        $documentType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tipo de documento eliminado exitosamente'
        ]);
    }

    /**
     * Reordenar tipos de documentos
     */
    public function reorder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order' => 'required|array',
            'order.*.id' => 'required|exists:document_types,id',
            'order.*.sort_order' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        foreach ($request->order as $item) {
            DocumentType::where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Orden actualizado exitosamente'
        ]);
    }
}
