import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import { CheckCircle2, PenTool, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Signature {
    id: number;
    signature_path: string;
    signature_url: string;
    signature_type: 'manual' | 'uploaded';
    is_default: boolean;
    created_at: string;
}

export default function SignatureManager() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    // Fetch signatures on mount
    useEffect(() => {
        fetchSignatures();
    }, []);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas drawing style
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const fetchSignatures = async () => {
        try {
            const response = await fetch(route('signatures.index'));
            const data = await response.json();
            console.log('Fetched signatures:', data);
            setSignatures(data.signatures || []);
        } catch (error) {
            console.error('Failed to fetch signatures:', error);
        }
    };

    // Get canvas coordinates accounting for scale
    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Calculate scale between canvas internal size and display size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Get coordinates relative to canvas and apply scale
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        return { x, y };
    };

    // Canvas drawing functions
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling on touch devices

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas is properly initialized
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);

        const { x, y } = getCanvasCoordinates(e, canvas);

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        e.preventDefault(); // Prevent scrolling on touch devices

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e, canvas);

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and refill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const saveCanvasSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setLoading(true);
        try {
            const dataUrl = canvas.toDataURL('image/png');

            const response = await fetch(route('signatures.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    signature: dataUrl,
                    signature_type: 'manual',
                    is_default: signatures.length === 0, // Set as default if first signature
                }),
            });

            if (response.ok) {
                showToast.success('✅ Signature saved successfully');
                clearCanvas();
                fetchSignatures();
            } else {
                const error = await response.json();
                showToast.error(`❌ ${error.message || 'Failed to save signature'}`);
            }
        } catch (error) {
            showToast.error('❌ An error occurred while saving signature');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast.error('❌ Please select an image file');
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                showToast.error('❌ File size must be less than 2MB');
                return;
            }

            setUploadFile(file);
        }
    };

    const uploadSignature = async () => {
        if (!uploadFile) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('signature_file', uploadFile);
            formData.append('signature_type', 'uploaded');
            formData.append('is_default', signatures.length === 0 ? '1' : '0');

            const response = await fetch(route('signatures.upload'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: formData,
            });

            if (response.ok) {
                showToast.success('✅ Signature uploaded successfully');
                setUploadFile(null);
                // Reset file input
                const fileInput = document.getElementById('signature-file') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                fetchSignatures();
            } else {
                const error = await response.json();
                showToast.error(`❌ ${error.message || 'Failed to upload signature'}`);
            }
        } catch (error) {
            showToast.error('❌ An error occurred while uploading signature');
        } finally {
            setLoading(false);
        }
    };

    const setAsDefault = async (signatureId: number) => {
        setLoading(true);
        try {
            const response = await fetch(route('signatures.setDefault', signatureId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                showToast.success('✅ Default signature updated');
                fetchSignatures();
            } else {
                const error = await response.json();
                showToast.error(`❌ ${error.message || 'Failed to set default signature'}`);
            }
        } catch (error) {
            showToast.error('❌ An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const deleteSignature = async (signatureId: number) => {
        if (!confirm('Are you sure you want to delete this signature?')) return;

        setLoading(true);
        try {
            const response = await fetch(route('signatures.destroy', signatureId), {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                showToast.success('✅ Signature deleted successfully');
                fetchSignatures();
            } else {
                const error = await response.json();
                showToast.error(`❌ ${error.message || 'Failed to delete signature'}`);
            }
        } catch (error) {
            showToast.error('❌ An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Digital Signature Management</CardTitle>
                    <CardDescription>Create and manage your digital signatures for document approval</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="draw" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="draw">
                                <PenTool className="mr-2 h-4 w-4" />
                                Draw Signature
                            </TabsTrigger>
                            <TabsTrigger value="upload">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Signature
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="draw" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Draw your signature below</Label>
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={200}
                                    className="w-full cursor-crosshair touch-none rounded-md border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={clearCanvas}>
                                    <X className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                                <Button type="button" onClick={saveCanvasSignature} disabled={loading}>
                                    Save Signature
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="upload" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signature-file">Upload signature image</Label>
                                <Input id="signature-file" type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFileChange} />
                                <p className="text-sm text-muted-foreground">Supported formats: PNG, JPG, JPEG. Max size: 2MB</p>
                            </div>
                            {uploadFile && (
                                <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                                    <p className="text-sm font-medium">Selected file: {uploadFile.name}</p>
                                    <p className="text-sm text-muted-foreground">Size: {(uploadFile.size / 1024).toFixed(2)} KB</p>
                                </div>
                            )}
                            <Button type="button" onClick={uploadSignature} disabled={!uploadFile || loading}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Signature
                            </Button>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Signatures List */}
            {signatures.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>My Signatures</CardTitle>
                        <CardDescription>Manage your saved signatures</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {signatures.map((signature) => (
                                <Card key={signature.id} className="relative">
                                    <CardContent className="p-4">
                                        <div className="mb-2 flex items-start justify-between">
                                            <Badge variant={signature.is_default ? 'default' : 'secondary'}>
                                                {signature.signature_type === 'manual' ? 'Drawn' : 'Uploaded'}
                                            </Badge>
                                            {signature.is_default && (
                                                <Badge variant="outline" className="ml-2">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mb-4 flex h-32 items-center justify-center rounded border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950">
                                            <img
                                                src={signature.signature_url}
                                                alt="Signature"
                                                className="max-h-full max-w-full object-contain"
                                                onError={(e) => {
                                                    console.error('Failed to load signature image:', signature);
                                                    e.currentTarget.src =
                                                        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            {!signature.is_default && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setAsDefault(signature.id)}
                                                    disabled={loading}
                                                >
                                                    Set as Default
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteSignature(signature.id)}
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
