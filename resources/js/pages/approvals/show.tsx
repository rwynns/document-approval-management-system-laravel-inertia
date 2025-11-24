import { AppSidebar } from '@/components/app-sidebar';
import PDFViewer from '@/components/pdf-viewer';
import SignaturePad from '@/components/signature-pad';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { Head, router, useForm } from '@inertiajs/react';
import {
    IconAlertCircle,
    IconArrowLeft,
    IconCalendar,
    IconCheck,
    IconClock,
    IconDownload,
    IconEye,
    IconFileText,
    IconPencil,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    profile?: {
        jabatan?: string;
    };
}

interface DokumenVersion {
    id: number;
    version: string;
    nama_file: string;
    tgl_upload: string;
    tipe_file: string;
    file_url: string;
    signed_file_url?: string;
    size_file: number;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
}

interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    jabatan?: {
        id: number;
        name: string;
    };
}

interface Dokumen {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    status: string;
    tgl_pengajuan: string;
    tgl_deadline?: string;
    deskripsi?: string;
    user?: User;
    masterflow?: Masterflow;
}

interface DokumenApproval {
    id: number;
    dokumen_id: number;
    user_id: number;
    approval_status: string;
    tgl_deadline?: string;
    tgl_approve?: string;
    alasan_reject?: string;
    comment?: string;
    signature_path?: string;
    signature_url?: string;
    created_at: string;
    dokumen: Dokumen;
    masterflow_step?: MasterflowStep;
    dokumen_version?: DokumenVersion;
    user?: User;
}

interface Props {
    approval: DokumenApproval;
    allApprovals: DokumenApproval[];
    canApprove: boolean;
}

export default function ApproverShow({ approval, allApprovals, canApprove }: Props) {
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    const approveForm = useForm({
        comment: '',
        signature: '',
    });

    const rejectForm = useForm({
        alasan_reject: '',
        comment: '',
    });

    // Real-time updates - Listen to dokumen-specific channel
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && approval?.dokumen?.id) {
            console.log('📡 Setting up real-time listener for dokumen:', approval.dokumen.id);

            const channelName = `dokumen.${approval.dokumen.id}`;
            const channel = window.Echo.channel(channelName);

            // Listen for dokumen updates
            channel.listen('dokumen.updated', (event: any) => {
                console.log('📡 Real-time dokumen update received on approval page:', event);

                // Reload the page to get fresh approval data
                router.reload({ preserveScroll: true });

                // Show toast notification
                if (event.dokumen?.judul_dokumen) {
                    showToast.success(`📡 Dokumen "${event.dokumen.judul_dokumen}" telah diupdate!`);
                }
            });

            // Monitor subscription
            channel.subscribed(() => {
                console.log('✅ Successfully subscribed to channel:', channelName);
            });

            channel.error((error: any) => {
                console.error('❌ Channel subscription error:', error);
            });

            console.log('📻 Subscribed to channel:', channelName);

            // Cleanup
            return () => {
                console.log('🔌 Leaving channel:', channelName);
                window.Echo.leave(channelName);
            };
        } else {
            if (!window.Echo) {
                console.error('❌ window.Echo not initialized! Check app.tsx');
            }
        }
    }, [approval?.dokumen?.id]);

    // Handle signature complete
    const handleSignatureComplete = (signature: string) => {
        setSignatureData(signature);
        approveForm.setData('signature', signature);
        setShowSignaturePad(false);
        showToast.success('✅ Tanda tangan berhasil ditambahkan!');
    };

    // Handle approve
    const handleApprove = () => {
        if (!signatureData) {
            showToast.error('❌ Silakan tanda tangani dokumen terlebih dahulu');
            return;
        }

        console.log('Submitting approval with signature:', {
            signatureLength: signatureData.length,
            signaturePreview: signatureData.substring(0, 50) + '...',
            hasComment: !!approveForm.data.comment,
        });

        // Set signature to form data
        approveForm.data.signature = signatureData;

        approveForm.post(route('approvals.approve', approval.id), {
            preserveScroll: true,
            onSuccess: () => {
                showToast.success('✅ Dokumen berhasil disetujui!');
                setIsPreviewDialogOpen(false);
                setSignatureData(null);
                setShowSignaturePad(false);
            },
            onError: (errors: any) => {
                console.error('Approval error:', errors);
                const errorMessage = errors.error || errors.signature || errors.message || 'Gagal menyetujui dokumen';
                showToast.error(`❌ ${errorMessage}`);
            },
        });
    };

    // Handle reject
    const handleReject = () => {
        rejectForm.post(route('approvals.reject', approval.id), {
            preserveScroll: true,
            onSuccess: () => {
                showToast.success('✅ Dokumen berhasil ditolak!');
                setIsRejectDialogOpen(false);
            },
            onError: () => {
                showToast.error('❌ Gagal menolak dokumen.');
            },
        });
    };

    // Handle download
    const handleDownload = () => {
        if (approval.dokumen_version) {
            window.location.href = `/dokumen/${approval.dokumen.id}/download/${approval.dokumen_version.id}`;
        }
    };

    // Handle preview
    const handlePreview = () => {
        if (approval.dokumen_version?.tipe_file.toLowerCase() === 'pdf') {
            setIsPreviewDialogOpen(true);
        } else {
            showToast.error('❌ Preview hanya tersedia untuk file PDF.');
        }
    };

    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string; icon: any }> = {
            pending: {
                label: 'Menunggu',
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: IconClock,
            },
            approved: {
                label: 'Disetujui',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: IconCheck,
            },
            rejected: {
                label: 'Ditolak',
                className: 'bg-red-100 text-red-800 border-red-300',
                icon: IconX,
            },
            waiting: {
                label: 'Menunggu Giliran',
                className: 'bg-gray-100 text-gray-800 border-gray-300',
                icon: IconClock,
            },
        };

        const { label, className, icon: Icon } = config[status] || config.pending;

        return (
            <Badge variant="outline" className={`font-sans ${className}`}>
                <Icon className="mr-1 h-3 w-3" />
                {label}
            </Badge>
        );
    };

    // Check if overdue
    const isOverdue = approval.tgl_deadline && new Date(approval.tgl_deadline) < new Date();

    // Use signed PDF if available, otherwise use original
    const fileUrl = approval.dokumen_version ? `/storage/${approval.dokumen_version.signed_file_url || approval.dokumen_version.file_url}` : '';

    return (
        <>
            <Head title={`Approval - ${approval.dokumen.judul_dokumen}`} />
            <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-6 p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <Button variant="ghost" size="sm" onClick={() => router.visit(route('approvals.index'))} className="font-sans">
                                        <IconArrowLeft className="mr-2 h-4 w-4" />
                                        Kembali
                                    </Button>
                                    <h1 className="font-serif text-3xl font-bold">{approval.dokumen.judul_dokumen}</h1>
                                    <p className="font-mono text-muted-foreground">{approval.dokumen.nomor_dokumen}</p>
                                </div>
                                {getStatusBadge(approval.approval_status)}
                            </div>

                            {/* Deadline Alert */}
                            {isOverdue && approval.approval_status === 'pending' && (
                                <Card className="border-red-200 bg-red-50">
                                    <CardContent className="flex items-center gap-3 p-4">
                                        <IconAlertCircle className="h-5 w-5 text-red-600" />
                                        <div>
                                            <p className="font-sans font-semibold text-red-900">Deadline Terlewat!</p>
                                            <p className="font-sans text-sm text-red-700">
                                                Approval ini melewati deadline pada {formatDate(approval.tgl_deadline)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Document Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-serif">Informasi Dokumen</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <Label className="font-sans text-muted-foreground">Pengaju</Label>
                                            <div className="mt-1 flex items-center gap-2">
                                                <IconUser className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-sans font-medium">{approval.dokumen.user?.name || '-'}</span>
                                            </div>
                                            {approval.dokumen.user?.profile?.jabatan && (
                                                <p className="ml-6 font-sans text-sm text-muted-foreground">
                                                    {approval.dokumen.user.profile.jabatan}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label className="font-sans text-muted-foreground">Tanggal Pengajuan</Label>
                                            <div className="mt-1 flex items-center gap-2">
                                                <IconCalendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-sans font-medium">{formatDate(approval.dokumen.tgl_pengajuan)}</span>
                                            </div>
                                        </div>

                                        {approval.tgl_deadline && (
                                            <div>
                                                <Label className="font-sans text-muted-foreground">Deadline Approval</Label>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <IconClock className="h-4 w-4 text-muted-foreground" />
                                                    <span className={`font-sans font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                                                        {formatDate(approval.tgl_deadline)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {approval.masterflow_step && (
                                            <div>
                                                <Label className="font-sans text-muted-foreground">Approval Step</Label>
                                                <p className="mt-1 font-sans font-medium">
                                                    Step {approval.masterflow_step.step_order}: {approval.masterflow_step.step_name}
                                                </p>
                                                {approval.masterflow_step.jabatan && (
                                                    <p className="font-sans text-sm text-muted-foreground">{approval.masterflow_step.jabatan.name}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {approval.dokumen.deskripsi && (
                                        <div>
                                            <Label className="font-sans text-muted-foreground">Deskripsi</Label>
                                            <p className="mt-1 font-sans">{approval.dokumen.deskripsi}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* File Info */}
                            {approval.dokumen_version && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="font-serif">File Dokumen</CardTitle>
                                            {approval.dokumen_version.signed_file_url && (
                                                <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                                                    <IconCheck className="mr-1 h-3 w-3" />
                                                    Sudah Ditandatangani
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                    <IconFileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-sans font-medium">
                                                        {approval.dokumen_version.nama_file}
                                                        {approval.dokumen_version.signed_file_url && (
                                                            <span className="ml-2 font-sans text-xs text-green-600">(Tertandatangani)</span>
                                                        )}
                                                    </p>
                                                    <p className="font-mono text-sm text-muted-foreground">
                                                        v{approval.dokumen_version.version} • {approval.dokumen_version.tipe_file.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {approval.dokumen_version.tipe_file.toLowerCase() === 'pdf' && (
                                                    <Button variant="outline" size="sm" onClick={handlePreview}>
                                                        <IconEye className="mr-2 h-4 w-4" />
                                                        Preview
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="sm" onClick={handleDownload}>
                                                    <IconDownload className="mr-2 h-4 w-4" />
                                                    Download
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Approval Workflow */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-serif">Alur Persetujuan</CardTitle>
                                    <CardDescription className="font-sans">Status persetujuan dari setiap approver</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {allApprovals.map((app, index) => (
                                            <div
                                                key={app.id}
                                                className={`flex items-start gap-4 rounded-lg border p-4 ${
                                                    app.id === approval.id ? 'border-primary bg-primary/5' : ''
                                                }`}
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-sm font-semibold">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-sans font-semibold">
                                                                {app.masterflow_step?.step_name || 'Custom Approver'}
                                                            </p>
                                                            <p className="font-sans text-sm text-muted-foreground">
                                                                {app.user?.name || app.user?.email || '-'}
                                                            </p>
                                                            {app.masterflow_step?.jabatan && (
                                                                <p className="font-sans text-xs text-muted-foreground">
                                                                    {app.masterflow_step.jabatan.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {getStatusBadge(app.approval_status)}
                                                    </div>

                                                    {app.tgl_approve && (
                                                        <p className="font-sans text-sm text-muted-foreground">
                                                            Disetujui pada {formatDate(app.tgl_approve)}
                                                        </p>
                                                    )}

                                                    {app.signature_url && app.approval_status === 'approved' && (
                                                        <div className="mt-2">
                                                            <p className="mb-1 font-sans text-xs text-muted-foreground">Tanda Tangan:</p>
                                                            <div className="inline-flex rounded border bg-white p-2">
                                                                <img
                                                                    src={
                                                                        app.signature_url.startsWith('http')
                                                                            ? app.signature_url
                                                                            : `${window.location.origin}${app.signature_url}`
                                                                    }
                                                                    alt="Signature"
                                                                    className="h-12 max-w-[150px] object-contain"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {app.comment && (
                                                        <div className="mt-2 rounded-md bg-muted p-2">
                                                            <p className="font-sans text-sm">{app.comment}</p>
                                                        </div>
                                                    )}

                                                    {app.alasan_reject && (
                                                        <div className="mt-2 rounded-md bg-red-50 p-2">
                                                            <p className="font-sans text-sm font-semibold text-red-900">Alasan Penolakan:</p>
                                                            <p className="font-sans text-sm text-red-700">{app.alasan_reject}</p>
                                                        </div>
                                                    )}

                                                    {app.id === approval.id && (
                                                        <Badge variant="outline" className="mt-2 border-primary text-primary">
                                                            Approval Anda
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Buttons */}
                            {canApprove && approval.approval_status === 'pending' && (
                                <Card className="border-primary">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div>
                                            <h3 className="font-serif text-lg font-semibold">Tindakan Diperlukan</h3>
                                            <p className="font-sans text-sm text-muted-foreground">Dokumen ini memerlukan persetujuan Anda</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsRejectDialogOpen(true)}
                                                className="border-red-300 font-sans text-red-700 hover:bg-red-50"
                                            >
                                                <IconX className="mr-2 h-4 w-4" />
                                                Tolak
                                            </Button>
                                            <Button onClick={handlePreview} className="font-sans">
                                                <IconCheck className="mr-2 h-4 w-4" />
                                                Setujui dengan Tanda Tangan
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Reject Dialog */}
                    <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Tolak Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Silakan berikan alasan penolakan dokumen "{approval.dokumen.judul_dokumen}"
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="alasan_reject" className="font-sans">
                                        Alasan Penolakan <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="alasan_reject"
                                        placeholder="Jelaskan alasan penolakan dokumen..."
                                        value={rejectForm.data.alasan_reject}
                                        onChange={(e) => rejectForm.setData('alasan_reject', e.target.value)}
                                        className="font-sans"
                                        rows={4}
                                        required
                                    />
                                    {rejectForm.errors.alasan_reject && (
                                        <p className="font-sans text-sm text-red-600">{rejectForm.errors.alasan_reject}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reject_comment" className="font-sans">
                                        Komentar Tambahan (Opsional)
                                    </Label>
                                    <Textarea
                                        id="reject_comment"
                                        placeholder="Tambahkan komentar jika diperlukan..."
                                        value={rejectForm.data.comment}
                                        onChange={(e) => rejectForm.setData('comment', e.target.value)}
                                        className="font-sans"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={rejectForm.processing || !rejectForm.data.alasan_reject}
                                    className="border-red-300 bg-red-600 font-sans hover:bg-red-700"
                                >
                                    {rejectForm.processing ? 'Memproses...' : 'Tolak Dokumen'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* PDF Preview Dialog with Signature */}
                    <Dialog
                        open={isPreviewDialogOpen}
                        onOpenChange={(open) => {
                            setIsPreviewDialogOpen(open);
                            if (!open) {
                                setShowSignaturePad(false);
                                setSignatureData(null);
                            }
                        }}
                    >
                        <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col p-0">
                            <DialogHeader className="shrink-0 border-b p-4">
                                <div className="space-y-1">
                                    <DialogTitle className="font-serif">Preview Dokumen</DialogTitle>
                                    <DialogDescription className="font-sans">{approval.dokumen_version?.nama_file}</DialogDescription>
                                    {/* Show status info */}
                                    {approval.approval_status !== 'pending' && (
                                        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-700">
                                            Dokumen ini sudah {approval.approval_status === 'approved' ? 'disetujui' : 'ditolak'}.
                                        </div>
                                    )}
                                    {!canApprove && approval.approval_status === 'pending' && (
                                        <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-700">
                                            Approval ini bukan untuk Anda atau sedang menunggu giliran.
                                        </div>
                                    )}
                                </div>
                            </DialogHeader>

                            <div className="flex flex-1 gap-4 overflow-hidden p-4">
                                {/* PDF Preview - Left Side */}
                                <div
                                    className={`${canApprove && approval.approval_status === 'pending' ? 'flex-1' : 'w-full'} overflow-auto rounded-lg border`}
                                >
                                    {fileUrl && (
                                        <PDFViewer
                                            fileUrl={fileUrl}
                                            fileName={approval.dokumen_version?.nama_file || 'document.pdf'}
                                            showControls={true}
                                            height="100%"
                                        />
                                    )}
                                </div>

                                {/* Signature Panel - Right Side - Only show for pending approvals that user can approve */}
                                {canApprove && approval.approval_status === 'pending' && (
                                    <div className="w-[400px] space-y-4 overflow-auto rounded-lg border bg-muted/20 p-4">
                                        <div>
                                            <h3 className="font-serif text-lg font-semibold">Tanda Tangan Persetujuan</h3>
                                            <p className="font-sans text-sm text-muted-foreground">Tanda tangani dokumen untuk menyetujuinya</p>
                                        </div>

                                        <Separator />

                                        {!showSignaturePad && !signatureData ? (
                                            <div className="space-y-3">
                                                <Card className="border-dashed">
                                                    <CardContent className="flex flex-col items-center justify-center py-8">
                                                        <IconPencil className="h-12 w-12 text-muted-foreground" />
                                                        <p className="mt-2 text-center font-sans text-sm text-muted-foreground">
                                                            Belum ada tanda tangan
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                                <Button
                                                    type="button"
                                                    onClick={() => setShowSignaturePad(true)}
                                                    className="w-full font-sans"
                                                    variant="outline"
                                                >
                                                    <IconPencil className="mr-2 h-4 w-4" />
                                                    Tambah Tanda Tangan
                                                </Button>
                                            </div>
                                        ) : signatureData ? (
                                            <div className="space-y-3">
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-center rounded border bg-white p-4">
                                                            <img src={signatureData} alt="Signature" className="max-h-24 max-w-full object-contain" />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSignatureData(null);
                                                            setShowSignaturePad(true);
                                                        }}
                                                        className="flex-1 font-sans"
                                                    >
                                                        Ganti
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSignatureData(null);
                                                            approveForm.setData('signature', '');
                                                        }}
                                                        className="font-sans text-red-600 hover:bg-red-50"
                                                    >
                                                        <IconX className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <SignaturePad onSignatureComplete={handleSignatureComplete} onCancel={() => setShowSignaturePad(false)} />
                                        )}

                                        {signatureData && (
                                            <>
                                                <Separator />

                                                <div className="space-y-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="preview-comment" className="font-sans">
                                                            Komentar (Opsional)
                                                        </Label>
                                                        <Textarea
                                                            id="preview-comment"
                                                            placeholder="Tambahkan komentar jika diperlukan..."
                                                            value={approveForm.data.comment}
                                                            onChange={(e) => approveForm.setData('comment', e.target.value)}
                                                            className="font-sans"
                                                            rows={3}
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Button
                                                            type="button"
                                                            onClick={handleApprove}
                                                            disabled={approveForm.processing}
                                                            className="w-full font-sans"
                                                        >
                                                            <IconCheck className="mr-2 h-4 w-4" />
                                                            {approveForm.processing ? 'Memproses...' : 'Setujui Dokumen'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => setIsPreviewDialogOpen(false)}
                                                            className="w-full font-sans"
                                                            disabled={approveForm.processing}
                                                        >
                                                            Batal
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
