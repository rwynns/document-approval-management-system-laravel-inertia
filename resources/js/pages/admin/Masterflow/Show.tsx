import { Head, Link } from '@inertiajs/react';
import { IconArrowLeft, IconBuilding, IconCheck, IconEdit, IconUser, IconX } from '@tabler/icons-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';

interface Jabatan {
    id: number;
    name: string;
}

interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    description?: string;
    is_required: boolean;
    jabatan: Jabatan;
}

interface Company {
    id: number;
    name: string;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    total_steps: number;
    created_at: string;
    updated_at: string;
    company: Company;
    steps: MasterflowStep[];
}

interface Props {
    masterflow: Masterflow;
    company: Company;
}

export default function Show({ masterflow, company }: Props) {
    return (
        <AppLayout>
            <Head title={`Detail Masterflow - ${masterflow.name}`} />

            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{masterflow.name}</h2>
                        <p className="flex items-center gap-2 text-muted-foreground">
                            <IconBuilding className="h-4 w-4" />
                            {company?.name || 'Unknown Company'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Link href={route('admin.masterflows.edit', masterflow.id)}>
                            <Button>
                                <IconEdit className="mr-2 h-4 w-4" />
                                Edit Masterflow
                            </Button>
                        </Link>
                        <Link href={route('admin.masterflows.index')}>
                            <Button variant="outline">
                                <IconArrowLeft className="mr-2 h-4 w-4" />
                                Kembali
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Masterflow Info */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Informasi Masterflow</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                                <Badge
                                    variant={masterflow.is_active ? 'default' : 'secondary'}
                                    className={masterflow.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                >
                                    {masterflow.is_active ? (
                                        <>
                                            <IconCheck className="mr-1 h-3 w-3" />
                                            Aktif
                                        </>
                                    ) : (
                                        <>
                                            <IconX className="mr-1 h-3 w-3" />
                                            Nonaktif
                                        </>
                                    )}
                                </Badge>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Total Langkah</h4>
                                <p className="text-2xl font-bold">{masterflow.total_steps}</p>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Deskripsi</h4>
                                <p className="text-sm">
                                    {masterflow.description || <span className="text-muted-foreground italic">Tidak ada deskripsi</span>}
                                </p>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Dibuat</h4>
                                <p className="text-sm">
                                    {new Date(masterflow.created_at).toLocaleDateString('id-ID', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Terakhir Diperbarui</h4>
                                <p className="text-sm">
                                    {new Date(masterflow.updated_at).toLocaleDateString('id-ID', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Flow Visualization */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Alur Persetujuan</CardTitle>
                            <CardDescription>Visualisasi langkah-langkah dalam proses approval.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {masterflow.steps.map((step, index) => (
                                    <div key={step.id} className="flex items-start space-x-4">
                                        {/* Step Number */}
                                        <div className="flex-shrink-0">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                                                {step.step_order}
                                            </div>
                                        </div>

                                        {/* Step Content */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="text-sm font-semibold">{step.step_name}</h4>
                                                {step.is_required && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Wajib
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="mt-1 flex items-center space-x-2">
                                                <IconUser className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">{step.jabatan.name}</span>
                                            </div>

                                            {step.description && <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>}
                                        </div>

                                        {/* Arrow (except for last item) */}
                                        {index < masterflow.steps.length - 1 && (
                                            <div className="ml-4 flex-shrink-0">
                                                <div className="ml-4 h-12 w-px bg-border"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Steps Summary Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ringkasan Langkah</CardTitle>
                        <CardDescription>Tabel ringkasan semua langkah dalam masterflow ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2 text-left font-medium text-muted-foreground">Urutan</th>
                                        <th className="p-2 text-left font-medium text-muted-foreground">Nama Langkah</th>
                                        <th className="p-2 text-left font-medium text-muted-foreground">Jabatan</th>
                                        <th className="p-2 text-left font-medium text-muted-foreground">Deskripsi</th>
                                        <th className="p-2 text-left font-medium text-muted-foreground">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {masterflow.steps.map((step) => (
                                        <tr key={step.id} className="border-b">
                                            <td className="p-2">
                                                <Badge variant="outline">{step.step_order}</Badge>
                                            </td>
                                            <td className="p-2 font-medium">{step.step_name}</td>
                                            <td className="p-2">{step.jabatan.name}</td>
                                            <td className="p-2 text-sm text-muted-foreground">
                                                {step.description || <span className="italic">Tidak ada deskripsi</span>}
                                            </td>
                                            <td className="p-2">
                                                {step.is_required ? (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Wajib
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">
                                                        Opsional
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
