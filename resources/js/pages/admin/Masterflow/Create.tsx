import { Head, Link, router } from '@inertiajs/react';
import { IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { showToast } from '@/lib/toast';

interface Jabatan {
    id: number;
    name: string;
}

interface Company {
    id: number;
    name: string;
}

interface MasterflowStep {
    step_order: number;
    step_name: string;
    description: string;
    is_required: boolean;
    jabatan_id: number;
}

interface Props {
    jabatans: Jabatan[];
    company: Company;
}

export default function Create({ jabatans, company }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
        steps: [
            {
                step_order: 1,
                step_name: '',
                description: '',
                is_required: true,
                jabatan_id: 0,
            },
        ] as MasterflowStep[],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const addStep = () => {
        setFormData({
            ...formData,
            steps: [
                ...formData.steps,
                {
                    step_order: formData.steps.length + 1,
                    step_name: '',
                    description: '',
                    is_required: true,
                    jabatan_id: 0,
                },
            ],
        });
    };

    const removeStep = (index: number) => {
        const newSteps = formData.steps.filter((_, i) => i !== index);
        // Reorder steps
        const reorderedSteps = newSteps.map((step, i) => ({
            ...step,
            step_order: i + 1,
        }));

        setFormData({
            ...formData,
            steps: reorderedSteps,
        });
    };

    const updateStep = (index: number, field: keyof MasterflowStep, value: any) => {
        const newSteps = [...formData.steps];
        newSteps[index] = {
            ...newSteps[index],
            [field]: value,
        };

        setFormData({
            ...formData,
            steps: newSteps,
        });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(route('admin.masterflows.store'), formData as any, {
            onSuccess: () => {
                showToast.success('Masterflow berhasil dibuat.');
            },
            onError: (errors) => {
                setErrors(errors);
                showToast.error('Gagal membuat masterflow. Periksa form Anda.');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AppLayout>
            <Head title="Tambah Masterflow" />

            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Tambah Masterflow</h2>
                        <p className="text-muted-foreground">Company: {company?.name || 'Unknown Company'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Link href={route('admin.masterflows.index')}>
                            <Button variant="outline">
                                <IconArrowLeft className="mr-2 h-4 w-4" />
                                Kembali
                            </Button>
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Masterflow</CardTitle>
                            <CardDescription>Isi informasi dasar untuk masterflow baru.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Masterflow *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Approval Surat Permohonan"
                                />
                                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Deskripsi</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Deskripsi singkat tentang masterflow ini"
                                    rows={3}
                                />
                                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Langkah Approval</CardTitle>
                                    <CardDescription>Definisikan urutan langkah approval yang diperlukan.</CardDescription>
                                </div>
                                <Button type="button" onClick={addStep} variant="outline" size="sm">
                                    <IconPlus className="mr-2 h-4 w-4" />
                                    Tambah Langkah
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {formData.steps.map((step, index) => (
                                <div key={index} className="space-y-4 rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold">Langkah {step.step_order}</h4>
                                        {formData.steps.length > 1 && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)}>
                                                <IconTrash className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Nama Langkah *</Label>
                                            <Input
                                                value={step.step_name}
                                                onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                                                placeholder="Contoh: Review Manager"
                                            />
                                            {errors[`steps.${index}.step_name`] && (
                                                <p className="text-sm text-red-600">{errors[`steps.${index}.step_name`]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Jabatan yang Bertanggung Jawab *</Label>
                                            <Select
                                                value={step.jabatan_id.toString()}
                                                onValueChange={(value) => updateStep(index, 'jabatan_id', parseInt(value))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih Jabatan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {jabatans.map((jabatan) => (
                                                        <SelectItem key={jabatan.id} value={jabatan.id.toString()}>
                                                            {jabatan.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors[`steps.${index}.jabatan_id`] && (
                                                <p className="text-sm text-red-600">{errors[`steps.${index}.jabatan_id`]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Deskripsi Langkah</Label>
                                        <Textarea
                                            value={step.description}
                                            onChange={(e) => updateStep(index, 'description', e.target.value)}
                                            placeholder="Deskripsi tentang apa yang dilakukan pada langkah ini"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ))}

                            {errors.steps && <p className="text-sm text-red-600">{errors.steps}</p>}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end space-x-2">
                        <Link href={route('admin.masterflows.index')}>
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan Masterflow'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
