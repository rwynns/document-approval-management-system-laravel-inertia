import { AppSidebar } from '@/components/app-sidebar';
import PDFViewer from '@/components/pdf-viewer';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head, router, usePage } from '@inertiajs/react';
import { IconArrowLeft, IconDownload, IconEdit, IconEye, IconFileText, IconSend, IconTrash } from '@tabler/icons-react';
import { AlertCircleIcon, CalendarIcon, CheckCircle2, CheckCircle2Icon, ClockIcon, FileTextIcon, XCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
    steps?: MasterflowStep[];
}

interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    jabatan_id: number;
    jabatan?: {
        id: number;
        name: string;
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
    status: string;
}

interface DokumenApproval {
    id: number;
    dokumen_id: number;
    user_id?: number;
    approver_email?: string;
    approval_order?: number;
    masterflow_step_id?: number;
    approval_status: string;
    tgl_approve?: string;
    tgl_deadline?: string;
    alasan_reject?: string;
    comment?: string;
    user?: User;
    masterflow_step?: MasterflowStep;
}

interface Dokumen {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    user_id: number;
    company_id?: number;
    aplikasi_id?: number;
    masterflow_id?: number;
    status: string;
    tgl_pengajuan: string;
    tgl_deadline?: string;
    deskripsi?: string;
    status_current: string;
    user?: User;
    masterflow?: Masterflow;
    versions?: DokumenVersion[];
    approvals?: DokumenApproval[];
    created_at: string;
    updated_at: string;
}

interface CustomApprover {
    email: string;
    order: number;
}

interface FormData {
    nomor_dokumen: string;
    judul_dokumen: string;
    masterflow_id: number | '' | 'custom';
    tgl_pengajuan: string;
    tgl_deadline: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>;
    custom_approvers: CustomApprover[];
}

export default function DokumenDetail({ dokumen: initialDokumen }: { dokumen: Dokumen }) {
    // Call usePage at top level (before any conditional returns)
    const pageProps = usePage().props as any;
    const { auth } = pageProps;

    // Add null check and provide default
    if (!initialDokumen || !initialDokumen.id) {
        return (
            <>
                <Head title="Dokumen Not Found" />
                <SidebarProvider>
                    <AppSidebar variant="inset" />
                    <SidebarInset>
                        <SiteHeader />
                        <div className="flex flex-1 flex-col items-center justify-center">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold">Dokumen Tidak Ditemukan</h1>
                                <p className="mt-2 text-muted-foreground">Data dokumen tidak tersedia</p>
                                <Button className="mt-4" onClick={() => router.visit('/user/dokumen')}>
                                    Kembali ke Daftar Dokumen
                                </Button>
                            </div>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </>
        );
    }

    const [dokumen, setDokumen] = useState<Dokumen>(initialDokumen);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [previewFileUrl, setPreviewFileUrl] = useState<string>('');
    const [previewFileName, setPreviewFileName] = useState<string>('');
    const [masterflows, setMasterflows] = useState<Masterflow[]>([]);
    const [selectedMasterflow, setSelectedMasterflow] = useState<Masterflow | null>(null);
    const [availableApprovers, setAvailableApprovers] = useState<Record<number, any[]>>({});
    const [formData, setFormData] = useState<FormData>({
        nomor_dokumen: dokumen?.nomor_dokumen || '',
        judul_dokumen: dokumen?.judul_dokumen || '',
        masterflow_id: dokumen?.masterflow_id || '',
        tgl_pengajuan: dokumen?.tgl_pengajuan || '',
        tgl_deadline: dokumen?.tgl_deadline || '',
        deskripsi: dokumen?.deskripsi || '',
        file: null,
        approvers: {},
        custom_approvers: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    // Debug log
    useEffect(() => {
        console.log('Dokumen data:', dokumen);
        console.log('Initial dokumen:', initialDokumen);
        console.log('Dokumen ID:', dokumen?.id);
        console.log('All props:', pageProps);
    }, []);

    // Fetch latest dokumen data
    const fetchDokumen = async () => {
        try {
            const response = await api.get(`/dokumen/${dokumen.id}`);
            console.log('Fetched dokumen:', response.data);

            // Check if response has dokumen data
            if (response.data && response.data.id) {
                setDokumen(response.data);
                return response.data;
            } else {
                console.warn('Invalid dokumen data received:', response.data);
                return null;
            }
        } catch (error) {
            console.error('Error fetching dokumen:', error);
            return null;
        }
    };

    // Fetch masterflows
    const fetchMasterflows = async () => {
        try {
            const response = await api.get('/masterflows');
            setMasterflows(response.data.masterflows || []);
        } catch (error) {
            console.error('Error fetching masterflows:', error);
        }
    };

    useEffect(() => {
        fetchMasterflows();

        // Real-time updates dengan Laravel Reverb (via Echo)
        if (typeof window !== 'undefined' && window.Echo && dokumen.id) {
            console.log('📡 Setting up real-time listener for dokumen:', dokumen.id);

            const channelName = `dokumen.${dokumen.id}`;

            window.Echo.channel(channelName).listen('dokumen.updated', (event: any) => {
                console.log('📡 Real-time update received:', event);

                // Update dokumen state dengan data terbaru
                if (event.dokumen && event.dokumen.id === dokumen.id) {
                    setDokumen(event.dokumen);

                    // Tampilkan notifikasi toast
                    showToast.success('📡 Dokumen telah diupdate secara real-time!');
                }
            });

            // Cleanup saat component unmount
            return () => {
                console.log('🔌 Leaving channel:', channelName);
                window.Echo.leave(channelName);
            };
        }
    }, [dokumen.id]);

    // Calculate approval progress
    const getApprovalProgress = () => {
        if (!dokumen.approvals || dokumen.approvals.length === 0) {
            return { percentage: 0, approved: 0, total: 0, pending: 0, rejected: 0 };
        }

        const total = dokumen.approvals.length;
        const approved = dokumen.approvals.filter((a) => a.approval_status === 'approved' || a.approval_status === 'skipped').length;
        const pending = dokumen.approvals.filter((a) => a.approval_status === 'pending').length;
        const rejected = dokumen.approvals.filter((a) => a.approval_status === 'rejected').length;
        const percentage = (approved / total) * 100;

        return { percentage, approved, total, pending, rejected };
    };

    const progress = getApprovalProgress();

    // Get status badge
    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
            draft: {
                label: 'Draft',
                icon: FileTextIcon,
                className: 'bg-gray-100 text-gray-800 border-gray-300',
            },
            pending: {
                label: 'Pending',
                icon: ClockIcon,
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            },
            submitted: {
                label: 'Submitted',
                icon: CheckCircle2Icon,
                className: 'bg-blue-100 text-blue-800 border-blue-300',
            },
            under_review: {
                label: 'Under Review',
                icon: AlertCircleIcon,
                className: 'bg-orange-100 text-orange-800 border-orange-300',
            },
            approved: {
                label: 'Approved',
                icon: CheckCircle2Icon,
                className: 'bg-green-100 text-green-800 border-green-300',
            },
            rejected: {
                label: 'Rejected',
                icon: XCircleIcon,
                className: 'bg-red-100 text-red-800 border-red-300',
            },
        };

        const config = statusConfig[status] || statusConfig.draft;
        const IconComponent = config.icon;

        return (
            <Badge variant="outline" className={`font-sans ${config.className}`}>
                <IconComponent className="mr-1 h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    // Get approval status badge
    const getApprovalStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            pending: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            approved: { label: 'Disetujui', className: 'bg-green-100 text-green-800 border-green-300' },
            skipped: { label: 'Disetujui', className: 'bg-green-100 text-green-800 border-green-300' },
            rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-800 border-red-300' },
            waiting: { label: 'Menunggu Giliran', className: 'bg-gray-100 text-gray-800 border-gray-300' },
        };

        const config = statusConfig[status] || statusConfig.pending;
        return (
            <Badge variant="outline" className={`font-sans ${config.className}`}>
                {config.label}
            </Badge>
        );
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';

            return date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (error) {
            return '-';
        }
    };

    // Handle edit
    const handleEdit = () => {
        if (dokumen.status !== 'draft' && dokumen.status !== 'rejected') {
            showToast.error('❌ Hanya dokumen dengan status Draft atau Rejected yang dapat diedit.');
            return;
        }

        // Populate form with current dokumen data
        setFormData({
            nomor_dokumen: dokumen.nomor_dokumen,
            judul_dokumen: dokumen.judul_dokumen,
            masterflow_id: dokumen.masterflow_id || '',
            tgl_pengajuan: dokumen.tgl_pengajuan,
            tgl_deadline: dokumen.tgl_deadline || '',
            deskripsi: dokumen.deskripsi || '',
            file: null,
            approvers: {},
            custom_approvers: [],
        });

        // Load masterflow if exists
        if (dokumen.masterflow_id && dokumen.masterflow) {
            setSelectedMasterflow(dokumen.masterflow);
            fetchApproversForMasterflow(dokumen.masterflow_id);
        } else if (isCustomApproval && dokumen.approvals) {
            // Load custom approvers
            const customApprovers = dokumen.approvals.map((a) => ({
                email: a.approver_email || '',
                order: a.approval_order || 1,
            }));
            setFormData((prev) => ({
                ...prev,
                masterflow_id: 'custom',
                custom_approvers: customApprovers,
            }));
        }

        setIsEditDialogOpen(true);
    };

    // Fetch approvers for a specific masterflow
    const fetchApproversForMasterflow = async (masterflowId: number) => {
        try {
            const response = await api.get(`/masterflows/${masterflowId}/steps`);
            const masterflowWithSteps = {
                ...dokumen.masterflow,
                steps: response.data.steps || [],
            };
            setSelectedMasterflow(masterflowWithSteps as Masterflow);

            // Fetch available approvers for each step
            const approversData: Record<number, any[]> = {};
            for (const step of response.data.steps || []) {
                if (step.jabatan_id) {
                    try {
                        const usersResponse = await api.get(`/users-by-jabatan/${step.jabatan_id}`);
                        approversData[step.id] = usersResponse.data || [];
                    } catch (error) {
                        console.error(`Error fetching users for jabatan ${step.jabatan_id}:`, error);
                        approversData[step.id] = [];
                    }
                }
            }
            setAvailableApprovers(approversData);

            // Populate existing approvers
            if (dokumen.approvals) {
                const existingApprovers: Record<number, number> = {};
                dokumen.approvals.forEach((approval) => {
                    if (approval.masterflow_step_id && approval.user_id) {
                        existingApprovers[approval.masterflow_step_id] = approval.user_id;
                    }
                });
                setFormData((prev) => ({
                    ...prev,
                    approvers: existingApprovers,
                }));
            }
        } catch (error) {
            console.error('Error fetching approvers:', error);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: [],
            }));
        }
    };

    // Handle file change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData((prev) => ({
                ...prev,
                file: e.target.files![0],
            }));

            if (errors.file) {
                setErrors((prev) => ({
                    ...prev,
                    file: [],
                }));
            }
        }
    };

    // Handle masterflow change in edit
    const handleMasterflowChange = async (value: string) => {
        if (value === 'custom') {
            setFormData((prev) => ({
                ...prev,
                masterflow_id: 'custom',
                approvers: {},
                custom_approvers: [{ email: '', order: 1 }],
            }));
            setSelectedMasterflow(null);
            setAvailableApprovers({});
            return;
        }

        const masterflowId = Number(value);
        setFormData((prev) => ({
            ...prev,
            masterflow_id: masterflowId,
            approvers: {},
            custom_approvers: [],
        }));

        fetchApproversForMasterflow(masterflowId);
    };

    // Handle approver selection
    const handleApproverChange = (stepId: number, userId: string) => {
        setFormData((prev) => ({
            ...prev,
            approvers: {
                ...prev.approvers,
                [stepId]: userId === '' ? '' : Number(userId),
            },
        }));
    };

    // Handle custom approver change
    const handleCustomApproverChange = (index: number, field: 'email' | 'order', value: string | number) => {
        setFormData((prev) => {
            const newCustomApprovers = [...prev.custom_approvers];
            newCustomApprovers[index] = {
                ...newCustomApprovers[index],
                [field]: value,
            };
            return {
                ...prev,
                custom_approvers: newCustomApprovers,
            };
        });
    };

    // Add custom approver
    const addCustomApprover = () => {
        setFormData((prev) => ({
            ...prev,
            custom_approvers: [...prev.custom_approvers, { email: '', order: prev.custom_approvers.length + 1 }],
        }));
    };

    // Remove custom approver
    const removeCustomApprover = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            custom_approvers: prev.custom_approvers.filter((_, i) => i !== index),
        }));
    };

    // Submit edit
    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        try {
            const submitData = new FormData();
            submitData.append('_method', 'PUT');
            submitData.append('judul_dokumen', formData.judul_dokumen);
            submitData.append('deskripsi', formData.deskripsi);
            if (formData.tgl_deadline) {
                submitData.append('tgl_deadline', formData.tgl_deadline);
            }
            if (formData.file) {
                submitData.append('file', formData.file);
            }

            router.post(`/dokumen/${dokumen.id}`, submitData, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    showToast.success('🎉 Dokumen berhasil diupdate!');
                    setIsEditDialogOpen(false);
                    fetchDokumen();
                },
                onError: (errors) => {
                    console.error('Form submission errors:', errors);
                    setErrors(errors as unknown as Record<string, string[]>);
                    showToast.error('❌ Gagal update dokumen. Silakan cek form.');
                },
            });
        } catch (error: any) {
            console.error('Form submission error:', error);
            showToast.error(`❌ Gagal update dokumen. ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = () => {
        if (dokumen.status !== 'draft') {
            showToast.error('❌ Hanya dokumen dengan status Draft yang dapat dihapus.');
            return;
        }
        setIsDeleteDialogOpen(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        try {
            await api.delete(`/dokumen/${dokumen.id}`);
            showToast.success('🎉 Dokumen berhasil dihapus!');
            router.visit('/user/dokumen');
        } catch (error: any) {
            showToast.error(`❌ Gagal menghapus dokumen. ${error.response?.data?.message || error.message}`);
        }
    };

    // Handle preview document
    const handlePreview = (version: DokumenVersion) => {
        const fileUrl = `/storage/${version.file_url}`;
        const isPDF = version.tipe_file.toLowerCase() === 'pdf';

        if (!isPDF) {
            showToast.error('❌ Preview hanya tersedia untuk file PDF.');
            return;
        }

        setPreviewFileUrl(fileUrl);
        setPreviewFileName(version.nama_file);
        setIsPreviewDialogOpen(true);
    };

    // Handle submit for approval (untuk draft dokumen)
    const handleSubmitForApproval = () => {
        if (dokumen.status !== 'draft') {
            showToast.error('❌ Hanya dokumen draft yang dapat disubmit.');
            return;
        }
        setIsSubmitDialogOpen(true);
    };

    // Confirm submit for approval
    const confirmSubmitForApproval = async () => {
        setIsSubmitting(true);

        router.post(
            `/dokumen/${dokumen.id}/submit`,
            {},
            {
                preserveState: false, // Force full reload to get fresh data
                preserveScroll: true,
                onSuccess: () => {
                    showToast.success('🎉 Dokumen berhasil disubmit untuk approval!');
                    setIsSubmitDialogOpen(false);
                    setIsSubmitting(false);
                },
                onError: (errors: any) => {
                    console.error('Submit error:', errors);
                    showToast.error(`❌ Gagal submit dokumen. ${errors.error || 'Silakan coba lagi.'}`);
                    setIsSubmitting(false);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    // Download file
    const handleDownload = (versionId?: number) => {
        const url = versionId ? `/dokumen/${dokumen.id}/download/${versionId}` : `/dokumen/${dokumen.id}/download`;
        window.location.href = url;
    };

    // Sort approvals by order or step_order
    const sortedApprovals = [...(dokumen.approvals || [])].sort((a, b) => {
        // For custom approval (has approval_order)
        if (a.approval_order !== undefined && b.approval_order !== undefined) {
            return a.approval_order - b.approval_order;
        }
        // For existing masterflow (has masterflow_step)
        if (a.masterflow_step && b.masterflow_step) {
            return a.masterflow_step.step_order - b.masterflow_step.step_order;
        }
        return 0;
    });

    // Check if custom approval
    const isCustomApproval = dokumen.approvals && dokumen.approvals.length > 0 && dokumen.approvals[0].approver_email;

    return (
        <>
            <Head title={`Detail - ${dokumen.judul_dokumen}`} />
            <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => router.visit('/user/dokumen')}>
                                                <IconArrowLeft className="h-4 w-4" />
                                            </Button>
                                            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">Detail Dokumen</h1>
                                        </div>
                                        <p className="font-sans text-sm text-muted-foreground">
                                            Nomor: <span className="font-mono">{dokumen?.nomor_dokumen || 'N/A'}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(dokumen?.status === 'draft' || dokumen?.status === 'rejected') && (
                                            <>
                                                <Button variant="outline" size="sm" onClick={handleEdit}>
                                                    <IconEdit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                                                    <IconTrash className="mr-2 h-4 w-4" />
                                                    Hapus
                                                </Button>
                                            </>
                                        )}
                                        {dokumen?.status === 'draft' && (
                                            <Button size="sm" onClick={handleSubmitForApproval} className="bg-green-600 hover:bg-green-700">
                                                <IconSend className="mr-2 h-4 w-4" />
                                                Submit untuk Approval
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Document Info Card */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="font-serif text-xl">{dokumen?.judul_dokumen || 'Untitled'}</CardTitle>
                                                <CardDescription className="font-sans">
                                                    Diajukan oleh <span className="font-medium">{dokumen?.user?.name || 'Unknown'}</span> pada{' '}
                                                    {formatDate(dokumen?.tgl_pengajuan)}
                                                </CardDescription>
                                            </div>
                                            {getStatusBadge(dokumen?.status || 'draft')}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Masterflow</p>
                                                <p className="font-sans text-sm">
                                                    {isCustomApproval ? (
                                                        <span className="text-primary">✨ Custom Approval</span>
                                                    ) : (
                                                        dokumen.masterflow?.name || '-'
                                                    )}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Deadline</p>
                                                <p className="font-sans text-sm">
                                                    {dokumen.tgl_deadline ? (
                                                        <span className="flex items-center gap-1">
                                                            <CalendarIcon className="h-4 w-4" />
                                                            {formatDate(dokumen.tgl_deadline)}
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {dokumen.deskripsi && (
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Deskripsi</p>
                                                <p className="font-sans text-sm text-foreground">{dokumen.deskripsi}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Approval Progress Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-serif text-lg">Progress Persetujuan</CardTitle>
                                        <CardDescription className="font-sans">
                                            {progress.approved} dari {progress.total} approver telah menyetujui
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-sans text-muted-foreground">Progress</span>
                                                <span className="font-mono font-medium">{Math.round(progress.percentage)}%</span>
                                            </div>
                                            <Progress value={progress.percentage} className="h-2" />
                                        </div>

                                        <div className="grid gap-2 md:grid-cols-3">
                                            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                                                <CheckCircle2Icon className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <p className="font-mono text-lg font-bold text-green-900">{progress.approved}</p>
                                                    <p className="text-xs text-green-700">Disetujui</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                                                <ClockIcon className="h-5 w-5 text-yellow-600" />
                                                <div>
                                                    <p className="font-mono text-lg font-bold text-yellow-900">{progress.pending}</p>
                                                    <p className="text-xs text-yellow-700">Pending</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                                                <XCircleIcon className="h-5 w-5 text-red-600" />
                                                <div>
                                                    <p className="font-mono text-lg font-bold text-red-900">{progress.rejected}</p>
                                                    <p className="text-xs text-red-700">Ditolak</p>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Approval Steps */}
                                        <div className="space-y-3">
                                            <h4 className="font-sans text-sm font-semibold">Rincian Persetujuan</h4>
                                            {sortedApprovals.map((approval, index) => (
                                                <div
                                                    key={approval.id}
                                                    className={`flex items-start gap-4 rounded-lg border p-4 ${
                                                        approval.approval_status === 'approved' || approval.approval_status === 'skipped'
                                                            ? 'border-green-200 bg-green-50/50'
                                                            : approval.approval_status === 'rejected'
                                                              ? 'border-red-200 bg-red-50/50'
                                                              : 'border-border bg-background'
                                                    }`}
                                                >
                                                    {/* Step Number */}
                                                    <div
                                                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${
                                                            approval.approval_status === 'approved' || approval.approval_status === 'skipped'
                                                                ? 'bg-green-600 text-white'
                                                                : approval.approval_status === 'rejected'
                                                                  ? 'bg-red-600 text-white'
                                                                  : approval.approval_status === 'pending'
                                                                    ? 'bg-yellow-500 text-white'
                                                                    : 'bg-gray-300 text-gray-600'
                                                        }`}
                                                    >
                                                        {index + 1}
                                                    </div>

                                                    {/* Approval Info */}
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1">
                                                                {isCustomApproval ? (
                                                                    <>
                                                                        <p className="font-sans text-sm font-medium">{approval.approver_email}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Tingkat {approval.approval_order}
                                                                        </p>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p className="font-sans text-sm font-medium">{approval.user?.name}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {approval.masterflow_step?.jabatan?.name} •{' '}
                                                                            {approval.masterflow_step?.step_name}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {getApprovalStatusBadge(approval.approval_status)}
                                                        </div>

                                                        {approval.tgl_approve && (
                                                            <p className="text-xs text-muted-foreground">
                                                                <ClockIcon className="mr-1 inline h-3 w-3" />
                                                                {approval.approval_status === 'approved' || approval.approval_status === 'skipped'
                                                                    ? 'Disetujui'
                                                                    : 'Ditolak'}{' '}
                                                                pada {formatDate(approval.tgl_approve)}
                                                            </p>
                                                        )}

                                                        {approval.comment && (
                                                            <div className="rounded-md bg-background p-2 text-xs">
                                                                <p className="font-medium">Komentar:</p>
                                                                <p className="text-muted-foreground">{approval.comment}</p>
                                                            </div>
                                                        )}

                                                        {approval.alasan_reject && (
                                                            <div className="rounded-md bg-red-50 p-2 text-xs text-red-900">
                                                                <p className="font-medium">Alasan Penolakan:</p>
                                                                <p>{approval.alasan_reject}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* File Versions Card */}
                                {dokumen.versions && dokumen.versions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="font-serif text-lg">Riwayat File</CardTitle>
                                            <CardDescription className="font-sans">Versi dokumen yang telah diupload</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {dokumen.versions
                                                    .sort((a, b) => new Date(b.tgl_upload).getTime() - new Date(a.tgl_upload).getTime())
                                                    .map((version) => {
                                                        const isPDF = version.tipe_file.toLowerCase() === 'pdf';
                                                        return (
                                                            <div
                                                                key={version.id}
                                                                className="flex items-center justify-between rounded-lg border border-border bg-background p-3 hover:bg-muted/50"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                                        <IconFileText className="h-5 w-5 text-primary" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-sans text-sm font-medium">{version.nama_file}</p>
                                                                        <p className="font-mono text-xs text-muted-foreground">
                                                                            v{version.version} • {formatFileSize(version.size_file)} •{' '}
                                                                            {formatDate(version.tgl_upload)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isPDF && (
                                                                        <Button variant="outline" size="sm" onClick={() => handlePreview(version)}>
                                                                            <IconEye className="mr-2 h-4 w-4" />
                                                                            Preview
                                                                        </Button>
                                                                    )}
                                                                    <Button variant="outline" size="sm" onClick={() => handleDownload(version.id)}>
                                                                        <IconDownload className="mr-2 h-4 w-4" />
                                                                        Download
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Edit Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                            <form onSubmit={handleSubmitEdit}>
                                <DialogHeader>
                                    <DialogTitle className="font-serif">Edit Dokumen</DialogTitle>
                                    <DialogDescription className="font-sans">Ubah informasi dokumen Anda di sini.</DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="judul_dokumen" className="font-sans">
                                            Judul Dokumen <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="judul_dokumen"
                                            name="judul_dokumen"
                                            value={formData.judul_dokumen}
                                            onChange={handleInputChange}
                                            className={errors.judul_dokumen ? 'border-red-500 font-sans' : 'font-sans'}
                                        />
                                        {errors.judul_dokumen && <p className="text-sm text-red-500">{errors.judul_dokumen[0]}</p>}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="tgl_deadline" className="font-sans">
                                            Deadline
                                        </Label>
                                        <Input
                                            id="tgl_deadline"
                                            name="tgl_deadline"
                                            type="date"
                                            value={formData.tgl_deadline}
                                            onChange={handleInputChange}
                                            className="font-sans"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="deskripsi" className="font-sans">
                                            Deskripsi
                                        </Label>
                                        <Textarea
                                            id="deskripsi"
                                            name="deskripsi"
                                            value={formData.deskripsi}
                                            onChange={handleInputChange}
                                            className="font-sans"
                                            rows={4}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="file" className="font-sans">
                                            Upload File Baru (Opsional)
                                        </Label>
                                        <Input
                                            id="file"
                                            name="file"
                                            type="file"
                                            onChange={handleFileChange}
                                            className="font-sans"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                        />
                                        <p className="text-xs text-muted-foreground">Kosongkan jika tidak ingin mengganti file. Max 10MB.</p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsEditDialogOpen(false)}
                                        disabled={isSubmitting}
                                        className="font-sans"
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="font-sans">
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Hapus Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin menghapus dokumen "<strong>{dokumen.judul_dokumen}</strong>"? Tindakan ini tidak dapat
                                    dibatalkan.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button type="button" variant="destructive" onClick={confirmDelete} className="font-sans">
                                    Hapus
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Submit Confirmation Dialog */}
                    <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Submit untuk Approval</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin mengirim dokumen "<strong>{dokumen.judul_dokumen}</strong>" untuk approval?
                                    <br />
                                    <br />
                                    Setelah disubmit, dokumen akan masuk ke proses approval dan tidak dapat diedit kecuali ditolak.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsSubmitDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-green-600 font-sans hover:bg-green-700"
                                    onClick={confirmSubmitForApproval}
                                    disabled={isSubmitting}
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Mengirim...' : 'Ya, Submit Sekarang'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* PDF Preview Dialog */}
                    <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                        <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col p-0">
                            <DialogHeader className="shrink-0 border-b p-4">
                                <DialogTitle className="font-serif">Preview Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">{previewFileName}</DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-auto p-4">
                                {previewFileUrl && (
                                    <PDFViewer fileUrl={previewFileUrl} fileName={previewFileName} showControls={true} height="100%" />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
