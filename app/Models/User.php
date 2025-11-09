<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'pin',
        'google_id',
        'google_token',
        'google_refresh_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'pin',
        'remember_token',
        'google_token',
        'google_refresh_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the user's profile.
     */
    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * Get the user's authorizations.
     */
    public function userAuths()
    {
        return $this->hasMany(UsersAuth::class);
    }

    /**
     * Get the user's authorizations with relationships.
     */
    public function user_auths()
    {
        return $this->hasMany(UsersAuth::class);
    }

    /**
     * Get masterflows available for this user's company.
     */
    public function availableMasterflows()
    {
        if ($this->user_auths->isEmpty()) {
            return collect();
        }

        $companyId = $this->user_auths->first()->company_id;

        return Masterflow::where('company_id', $companyId)
            ->where('is_active', true)
            ->with(['steps.jabatan'])
            ->orderBy('name')
            ->get();
    }

    /**
     * Get the user's company.
     */
    public function getCompany()
    {
        if ($this->user_auths->isEmpty()) {
            return null;
        }

        return $this->user_auths->first()->company;
    }
}
