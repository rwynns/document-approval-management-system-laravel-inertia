import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileText, Upload } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Masterflow {
    id: number;
    name: string;
    steps_count: number;
}

interface ApprovalStep {
    id: number;
    step_order: number;
    approver_name: string;
    role_name: string;
}

interface CreateDokumenProps {
    masterflows: Masterflow[];
    errors: Record<string, string>;
}

export default function CreateDokumen({ masterflows, errors }: CreateDokumenProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [approvalFlow, setApprovalFlow] = useState<ApprovalStep[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing } = useForm({
        judul_dokumen: '',
        jenis_dokumen: '',
        nomor_dokumen: '',
        masterflow_id: '',
        tgl_deadline: '',
        deskripsi: '',
        file: null as File | null,
        action: 'save_draft',
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const handleFile = useCallback(
        (file: File) => {
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'image/jpeg',
                'image/png',
            ];

            if (!allowedTypes.includes(file.type)) {
                alert('Format file tidak didukung!');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert('Ukuran file maksimal 10MB!');
                return;
            }

            setSelectedFile(file);
            setData('file', file);
        },
        [setData],
    );

    const handleFileDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        },
        [handleFile],
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
        },
        [handleFile],
    );

    const clearFile = useCallback(() => {
        setSelectedFile(null);
        setData('file', null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [setData]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const loadApprovalFlow = async (masterflowId: string) => {
        if (!masterflowId) {
            setApprovalFlow([]);
            return;
        }

        try {
            const response = await fetch(route('masterflows.steps', masterflowId));
            const data = await response.json();
            setApprovalFlow(data.steps || []);
        } catch (error) {
            console.error('Error loading approval flow:', error);
            setApprovalFlow([]);
        }
    };

    const handleSubmit = (e: React.FormEvent, action: 'save_draft' | 'submit') => {
        e.preventDefault();

        // Update form data with the file and action
        const submitData = {
            ...data,
            action,
            file: selectedFile,
        };

        post(route('dokumen.store'), {
            forceFormData: true,
            onSuccess: () => {
                setSelectedFile(null);
                setData({
                    judul_dokumen: '',
                    jenis_dokumen: '',
                    nomor_dokumen: '',
                    masterflow_id: '',
                    tgl_deadline: '',
                    deskripsi: '',
                    file: null,
                    action: 'save_draft',
                });
            },
        });
    };

    useEffect(() => {
        if (data.masterflow_id) {
            loadApprovalFlow(data.masterflow_id);
        }
    }, [data.masterflow_id]);

    return (
        <AppLayout>
            <Head title="Upload Dokumen" />

            <div className="mx-auto max-w-4xl px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="mb-2 text-3xl font-bold text-gray-900">Upload Dokumen</h1>
                        <p className="text-gray-600">Upload dokumen baru untuk proses approval</p>
                    </div>
                    <Link
                        href={route('dokumen.index')}
                        className="flex items-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Kembali</span>
                    </Link>
                </div>

                <form className="space-y-8">
                    {/* Document Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Dokumen</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Judul Dokumen */}
                                <div>
                                    <Label htmlFor="judul_dokumen">
                                        Judul Dokumen <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="judul_dokumen"
                                        value={data.judul_dokumen}
                                        onChange={(e) => setData('judul_dokumen', e.target.value)}
                                        placeholder="Masukkan judul dokumen"
                                        className={cn(errors.judul_dokumen && 'border-red-300')}
                                        required
                                    />
                                    {errors.judul_dokumen && <p className="mt-1 text-sm text-red-600">{errors.judul_dokumen}</p>}
                                </div>

                                {/* Jenis Dokumen */}
                                <div>
                                    <Label htmlFor="jenis_dokumen">
                                        Jenis Dokumen <span className="text-red-500">*</span>
                                    </Label>
                                    <Select onValueChange={(value) => setData('jenis_dokumen', value)}>
                                        <SelectTrigger className={cn(errors.jenis_dokumen && 'border-red-300')}>
                                            <SelectValue placeholder="Pilih jenis dokumen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kontrak">Kontrak</SelectItem>
                                            <SelectItem value="proposal">Proposal</SelectItem>
                                            <SelectItem value="laporan">Laporan</SelectItem>
                                            <SelectItem value="surat">Surat</SelectItem>
                                            <SelectItem value="invoice">Invoice</SelectItem>
                                            <SelectItem value="kebijakan">Kebijakan</SelectItem>
                                            <SelectItem value="prosedur">Prosedur</SelectItem>
                                            <SelectItem value="lainnya">Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.jenis_dokumen && <p className="mt-1 text-sm text-red-600">{errors.jenis_dokumen}</p>}
                                </div>

                                {/* Nomor Dokumen */}
                                <div>
                                    <Label htmlFor="nomor_dokumen">Nomor Dokumen</Label>
                                    <Input
                                        id="nomor_dokumen"
                                        value={data.nomor_dokumen}
                                        onChange={(e) => setData('nomor_dokumen', e.target.value)}
                                        placeholder="Nomor dokumen (opsional)"
                                        className={cn(errors.nomor_dokumen && 'border-red-300')}
                                    />
                                    {errors.nomor_dokumen && <p className="mt-1 text-sm text-red-600">{errors.nomor_dokumen}</p>}
                                </div>

                                {/* Tanggal Deadline */}
                                <div>
                                    <Label htmlFor="tgl_deadline">
                                        Tanggal Deadline <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="tgl_deadline"
                                        type="date"
                                        value={data.tgl_deadline}
                                        onChange={(e) => setData('tgl_deadline', e.target.value)}
                                        min={minDate}
                                        className={cn(errors.tgl_deadline && 'border-red-300')}
                                        required
                                    />
                                    {errors.tgl_deadline && <p className="mt-1 text-sm text-red-600">{errors.tgl_deadline}</p>}
                                </div>
                            </div>

                            {/* Masterflow */}
                            <div>
                                <Label htmlFor="masterflow_id">
                                    Alur Approval <span className="text-red-500">*</span>
                                </Label>
                                <Select onValueChange={(value) => setData('masterflow_id', value)}>
                                    <SelectTrigger className={cn(errors.masterflow_id && 'border-red-300')}>
                                        <SelectValue placeholder="Pilih alur approval" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {masterflows.map((flow) => (
                                            <SelectItem key={flow.id} value={flow.id.toString()}>
                                                {flow.name} ({flow.steps_count} tahap)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.masterflow_id && <p className="mt-1 text-sm text-red-600">{errors.masterflow_id}</p>}
                            </div>

                            {/* Deskripsi */}
                            <div>
                                <Label htmlFor="deskripsi">Deskripsi</Label>
                                <Textarea
                                    id="deskripsi"
                                    value={data.deskripsi}
                                    onChange={(e) => setData('deskripsi', e.target.value)}
                                    placeholder="Jelaskan dokumen ini..."
                                    rows={4}
                                    className={cn(errors.deskripsi && 'border-red-300')}
                                />
                                {errors.deskripsi && <p className="mt-1 text-sm text-red-600">{errors.deskripsi}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* File Upload */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload File</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                onDrop={handleFileDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                }}
                                className={cn(
                                    'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                                    isDragging ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:border-teal-400',
                                    errors.file && 'border-red-300 bg-red-50',
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                                    className="hidden"
                                    required
                                />

                                {!selectedFile ? (
                                    <div>
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                            <Upload className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="mb-2 text-lg font-medium text-gray-900">Upload File Dokumen</h3>
                                        <p className="mb-4 text-gray-600">Drag & drop file atau klik untuk browse</p>
                                        <Button type="button" onClick={() => fileInputRef.current?.click()} className="bg-teal-600 hover:bg-teal-700">
                                            Pilih File
                                        </Button>
                                        <p className="mt-3 text-sm text-gray-500">
                                            Format yang didukung: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center space-x-3">
                                            <div className="rounded-lg bg-teal-100 p-2">
                                                <FileText className="h-6 w-6 text-teal-600" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-medium text-gray-900">{selectedFile.name}</h4>
                                                <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-center space-x-3">
                                            <Button type="button" variant="ghost" onClick={clearFile} className="text-red-600 hover:text-red-700">
                                                Hapus
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-teal-600 hover:text-teal-700"
                                            >
                                                Ganti File
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {errors.file && <p className="mt-2 text-sm text-red-600">{errors.file}</p>}
                        </CardContent>
                    </Card>

                    {/* Approval Flow Preview */}
                    {approvalFlow.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Preview Alur Approval</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {approvalFlow.map((step, index) => (
                                        <div key={step.id} className="flex items-center space-x-4 rounded-lg bg-gray-50 p-4">
                                            <div className="flex-shrink-0">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 font-medium text-teal-600">
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{step.approver_name}</h4>
                                                <p className="text-sm text-gray-600">{step.role_name}</p>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {step.step_order === 1
                                                    ? 'Pertama'
                                                    : step.step_order === approvalFlow.length
                                                      ? 'Terakhir'
                                                      : `Ke-${step.step_order}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                        <Link
                            href={route('dokumen.index')}
                            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            Batal
                        </Link>

                        <div className="flex space-x-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => handleSubmit(e, 'save_draft')}
                                disabled={processing}
                                className="border-teal-600 text-teal-600 hover:bg-teal-50"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Draft'}
                            </Button>

                            <Button
                                type="button"
                                onClick={(e) => handleSubmit(e, 'submit')}
                                disabled={
                                    processing ||
                                    !data.judul_dokumen ||
                                    !data.jenis_dokumen ||
                                    !data.masterflow_id ||
                                    !data.tgl_deadline ||
                                    !selectedFile
                                }
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                {processing ? 'Memproses...' : 'Upload & Submit'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
