import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Users, Plus, Upload, Trash2, Edit2, X, Crop as CropIcon, Check, FileText, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Loader from '../components/Loader';
import { CardSkeleton } from '../components/Skeleton';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const navigate = useNavigate();
    const [previewUrl, setPreviewUrl] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    // Image Cropping States
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [imgSrc, setImgSrc] = useState('');
    const [showCropModal, setShowCropModal] = useState(false);
    const imgRef = useRef(null);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        rollNumber: '',
        className: '',
        image: null
    });

    const fetchStudents = async () => {
        try {
            const res = await api.get('/api/students');
            setStudents(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch students', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined); // Reset crop state
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImgSrc(reader.result?.toString() || '');
                setShowCropModal(true); // Open modal after reading
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        // Make a default square aspect crop centered
        const idealCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width, height
        );
        setCrop(idealCrop);
    };

    const applyCrop = async () => {
        if (!completedCrop || !imgRef.current) return;

        try {
            const canvas = document.createElement('canvas');
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
            canvas.width = completedCrop.width;
            canvas.height = completedCrop.height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                imgRef.current,
                completedCrop.x * scaleX, completedCrop.y * scaleY,
                completedCrop.width * scaleX, completedCrop.height * scaleY,
                0, 0,
                completedCrop.width, completedCrop.height
            );

            // Convert canvas to Blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    return;
                }
                const file = new File([blob], "cropped_face.jpg", { type: "image/jpeg" });
                setFormData({ ...formData, image: file });
                setPreviewUrl(URL.createObjectURL(file));
                setShowCropModal(false);
                toast.success('Crop applied successfully.');
            }, 'image/jpeg', 0.95);

        } catch (e) {
            console.error("Cropping failed", e);
            toast.error('Failed to crop image');
        }
    };

    const handleChange = (e) => {
        if (e.target.name === 'rollNumber') {
            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
            setFormData({ ...formData, rollNumber: val });
        } else if (e.target.name !== 'image') {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('className', formData.className);
            data.append('name', formData.name);
            data.append('rollNumber', formData.rollNumber);
            if (formData.image) {
                data.append('image', formData.image);
            }

            if (isEditing) {
                await api.put(`/api/students/${editId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success("Student updated successfully!");
            } else {
                await api.post('/api/students', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success("Student added successfully!");
            }

            resetForm();
            fetchStudents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving student.');
            console.error(error);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

        try {
            await api.delete(`/api/students/${id}`);
            toast.success("Student deleted successfully!");
            fetchStudents();
        } catch (error) {
            console.error('Failed to delete student', error);
            toast.error("Failed to delete student.");
        }
    };

    const handleEdit = (student) => {
        setFormData({
            name: student.name,
            rollNumber: student.rollNumber,
            className: student.className,
            image: null
        });
        setPreviewUrl(student.imageUrl);
        setEditId(student._id);
        setIsEditing(true);
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setIsAdding(false);
        setIsEditing(false);
        setEditId(null);
        setFormData({ name: '', rollNumber: '', className: '', image: null });
        setPreviewUrl('');
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                        <div className="h-4 w-48 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Student Directory</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage enrolled students and their facial recognition profiles.</p>
                </div>

                <button
                    onClick={() => isAdding ? resetForm() : setIsAdding(true)}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                    {isAdding ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {isAdding ? 'Cancel' : 'Add Student'}
                </button>
            </div>

            {/* Add Student Form */}
            {isAdding && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-8 animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{isEditing ? 'Edit Student Profile' : 'Register New Student'}</h3>
                    <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                                placeholder="e.g. Debraj Naik"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Registration No.</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                name="rollNumber"
                                value={formData.rollNumber}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                                placeholder="e.g. 2401326390"
                                minLength="10"
                                maxLength="10"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Class Name</label>
                            <input
                                type="text"
                                name="className"
                                value={formData.className}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                                placeholder="e.g. AI 101"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Student Photo (Required for Recognition)</label>

                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={onSelectFile}
                                        ref={fileInputRef}
                                        required={!isEditing && !formData.image}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary-500 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                    />
                                </div>
                            </div>

                            {isEditing && !formData.image && !previewUrl.startsWith('blob:') && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-1">Leave empty to keep current photo.</p>
                            )}

                            {previewUrl && (
                                <div className="mt-4 p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl relative inline-block">
                                    <p className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-3 tracking-wider">Final ID Profile Image</p>
                                    <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-full border-4 border-white shadow-md dark:border-slate-700" />
                                    <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md font-bold flex items-center shadow-sm">
                                        <Check className="w-3 h-3 mr-1" />
                                        Ready
                                    </div>
                                </div>
                            )}

                            {/* Cropper Modal Overlay */}
                            {showCropModal && imgSrc && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                        <div className="w-full flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                                <CropIcon className="w-6 h-6 mr-2 text-primary-600" />
                                                Crop Student Photo
                                            </h3>
                                            <button onClick={() => { setShowCropModal(false); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center w-full">Line up the bounding box so it focuses clearly on the student's face. This greatly improves the AI's detection accuracy.</p>

                                        <div className="bg-checkered dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner w-full flex justify-center overflow-hidden">
                                            <ReactCrop
                                                crop={crop}
                                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                                onComplete={(c) => setCompletedCrop(c)}
                                                aspect={1}
                                                circularCrop
                                                keepSelection
                                                className="max-h-[50vh]"
                                            >
                                                <img
                                                    ref={imgRef}
                                                    alt="Crop me"
                                                    src={imgSrc}
                                                    onLoad={onImageLoad}
                                                    className="max-h-[50vh] object-contain rounded-md"
                                                />
                                            </ReactCrop>
                                        </div>

                                        <div className="w-full flex justify-end mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 space-x-3">
                                            <button type="button" onClick={() => { setShowCropModal(false); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                Cancel
                                            </button>
                                            <button type="button" onClick={applyCrop} className="px-6 py-2.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm focus:ring-4 focus:ring-primary-500/30 flex items-center">
                                                <Check className="w-4 h-4 mr-2" />
                                                Confirm Crop
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitLoading}
                                className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                            >
                                {submitLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Student'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {students.map(student => (
                    <div key={student._id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow group flex flex-col items-center text-center">
                        <div className="relative mb-4">
                            <img
                                src={student.imageUrl}
                                alt={student.name}
                                className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm"
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150' }}
                            />
                            <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                                {/* Simulated status indicator */}
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{student.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">Reg No: {student.rollNumber}</p>
                        <button
                            onClick={() => navigate('/attendance')}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full mb-3 flex items-center gap-1.5 transition-colors"
                        >
                            <FileCheck className="w-3.5 h-3.5" /> View Attendance
                        </button>

                        {/* Gamification Stats */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex items-center px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold shadow-sm">
                                🟡 {student.focusCoins || 0} Coins
                            </div>
                            <div className="flex items-center px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-full text-xs font-bold shadow-sm">
                                🔥 {student.focusStreak || 0} Streak
                            </div>
                        </div>

                        <div className="w-full pt-4 mt-auto border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 dark:text-slate-300 rounded-md">
                                {student.className}
                            </span>
                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(student)} className="text-slate-400 hover:text-primary-600 transition-colors p-1" title="Edit Student">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(student._id, student.name)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remove Student">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {students.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Users className="w-12 h-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No students registered</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4 text-center max-w-sm">Add students to start tracking their engagement with facial recognition.</p>
                        <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:bg-slate-950 transition-colors">
                            Add First Student
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Students;
