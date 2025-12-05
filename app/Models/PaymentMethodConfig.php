<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class PaymentMethodConfig extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'type',
        'name',
        'description',
        'is_active',
        'display_order',
        // Yape
        'phone_number',
        'qr_image_path',
        // Transferencia
        'bank_name',
        'bank_logo_path',
        'account_holder',
        'account_number',
        'cci',
        'account_type',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeYape($query)
    {
        return $query->where('type', 'yape');
    }

    public function scopeTransfer($query)
    {
        return $query->where('type', 'transfer');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc')->orderBy('created_at', 'asc');
    }

    /**
     * Accessors
     */
    public function getQrImageUrlAttribute(): ?string
    {
        if (!$this->qr_image_path) {
            return null;
        }

        return Storage::url($this->qr_image_path);
    }

    public function getBankLogoUrlAttribute(): ?string
    {
        if (!$this->bank_logo_path) {
            return null;
        }

        return Storage::url($this->bank_logo_path);
    }

    /**
     * Helpers
     */
    public function isYape(): bool
    {
        return $this->type === 'yape';
    }

    public function isTransfer(): bool
    {
        return $this->type === 'transfer';
    }
}
