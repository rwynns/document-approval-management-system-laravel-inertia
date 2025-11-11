import { AppSidebar } from '@/components/app-sidebar';
import PDFViewer from '@/components/pdf-viewer';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

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
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

    const approveForm = useForm({
        comment: '',
    });

    const rejectForm = useForm({
        alasan_reject: '',
        comment: '',
    });

    // Handle approve
    const handleApprove = () => {
        approveForm.post(route('approvals.approve', approval.id), {
            preserveScroll: true,
            onSuccess: () => {
                showToast.success('✅ Dokumen berhasil disetujui!');
                setIsApproveDialogOpen(false);
            },
            onError: () => {
                showToast.error('❌ Gagal menyetujui dokumen.');
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

    const fileUrl = approval.dokumen_version ? `/storage/${approval.dokumen_version.file_url}` : '';

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
                                        <CardTitle className="font-serif">File Dokumen</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                    <IconFileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-sans font-medium">{approval.dokumen_version.nama_file}</p>
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
                                            <Button onClick={() => setIsApproveDialogOpen(true)} className="font-sans">
                                                <IconCheck className="mr-2 h-4 w-4" />
                                                Setujui
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Approve Dialog */}
                    <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Setujui Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin menyetujui dokumen "{approval.dokumen.judul_dokumen}"?
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="comment" className="font-sans">
                                        Komentar (Opsional)
                                    </Label>
                                    <Textarea
                                        id="comment"
                                        placeholder="Tambahkan komentar jika diperlukan..."
                                        value={approveForm.data.comment}
                                        onChange={(e) => approveForm.setData('comment', e.target.value)}
                                        className="font-sans"
                                        rows={4}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsApproveDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button type="button" onClick={handleApprove} disabled={approveForm.processing} className="font-sans">
                                    {approveForm.processing ? 'Memproses...' : 'Setujui'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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

                    {/* PDF Preview Dialog */}
                    <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                        <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col p-0">
                            <DialogHeader className="shrink-0 border-b p-4">
                                <DialogTitle className="font-serif">Preview Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">{approval.dokumen_version?.nama_file}</DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-auto p-4">
                                {fileUrl && (
                                    <PDFViewer
                                        fileUrl={fileUrl}
                                        fileName={approval.dokumen_version?.nama_file || 'document.pdf'}
                                        showControls={true}
                                        height="100%"
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
