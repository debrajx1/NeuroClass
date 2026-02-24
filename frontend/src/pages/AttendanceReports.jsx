import React, { useState, useEffect } from 'react';
import api from '../api';
import { Download, Calendar, Users, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from '../components/Loader';
import { TableSkeleton } from '../components/Skeleton';

const AttendanceReports = () => {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/api/analytics/attendance/daily');
            setReports(res.data);
            setIsLoading(false);
        } catch (error) {
            console.error("Fetch reports error:", error);
            toast.error("Failed to load attendance reports.");
            setIsLoading(false);
        }
    };

    const generatePDF = (dateGroup) => {
        try {
            if (!dateGroup || !dateGroup.sessions) {
                toast.error("No data available to generate PDF.");
                return;
            }

            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Safe date formatting function
            const safeFormatDate = (dateStr, formatStr) => {
                try {
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return "N/A";
                    return format(d, formatStr);
                } catch (e) {
                    return "N/A";
                }
            };

            // Header Background
            doc.setFillColor(79, 70, 229); // indigo-600
            doc.rect(0, 0, pageWidth, 40, 'F');

            // Header Text
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("NeuroClass Attendance Report", pageWidth / 2, 18, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, 28, { align: 'center' });
            doc.text(`Report Date: ${safeFormatDate(dateGroup.date, 'PPPP')}`, pageWidth / 2, 34, { align: 'center' });

            let currentY = 50;

            if (dateGroup.sessions.length === 0) {
                doc.setTextColor(100, 116, 139);
                doc.setFontSize(14);
                doc.text("No sessions recorded for this date.", 20, currentY);
            }

            dateGroup.sessions.forEach((session, index) => {
                // Check if we need a new page before session header
                if (currentY > pageHeight - 40) {
                    doc.addPage();
                    currentY = 20;
                }

                // Session Box Header
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.line(14, currentY - 5, pageWidth - 14, currentY - 5);

                doc.setTextColor(30, 41, 59); // slate-900
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`Class: ${session.className || 'Unknown'}`, 14, currentY);
                currentY += 6;

                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105); // slate-600
                doc.text(`Subject: ${session.subject || 'General'}`, 14, currentY);
                currentY += 5;

                const startTime = safeFormatDate(session.startTime, 'h:mm a');
                const endTime = session.endTime ? safeFormatDate(session.endTime, 'h:mm a') : 'Live';
                doc.text(`Timing: ${startTime} - ${endTime} | Present: ${session.presentCount}/${session.totalCount}`, 14, currentY);
                currentY += 8;

                // Create Table Data
                const tableColumn = ["#", "Name", "Roll Number", "Status"];
                const tableRows = (session.attendance || []).map((student, i) => [
                    i + 1,
                    student.name || 'Unknown',
                    student.rollNumber || 'N/A',
                    student.status || 'Absent'
                ]);

                // Add Table using explicit autoTable function
                autoTable(doc, {
                    startY: currentY,
                    head: [tableColumn],
                    body: tableRows,
                    theme: 'striped',
                    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                    columnStyles: {
                        0: { cellWidth: 15 },
                        3: { fontStyle: 'bold' }
                    },
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.column.index === 3) {
                            if (data.cell.raw === 'Present') {
                                data.cell.styles.textColor = [22, 163, 74]; // green-600
                            } else {
                                data.cell.styles.textColor = [220, 38, 38]; // red-600
                            }
                        }
                    },
                    margin: { left: 14, right: 14 },
                    styles: { fontSize: 9, cellPadding: 3 }
                });

                currentY = doc.lastAutoTable.finalY + 20;
            });

            // Footer for all pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); // slate-400
                doc.text(
                    `NeuroClass AI Analytics System - Confidential - Page ${i} of ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Save PDF
            const fileName = `Attendance_${dateGroup.date.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            doc.save(fileName);
            toast.success("PDF Downloaded successfully!");

        } catch (error) {
            console.error("Detailed PDF generation error:", error);
            toast.error(`PDF Error: ${error.message || "Unknown error"}`);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                        <div className="h-4 w-48 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg mt-2"></div>
                    </div>
                </div>
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex justify-between items-center pb-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="space-y-2">
                                <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                                <div className="h-4 w-32 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg"></div>
                            </div>
                            <div className="h-12 w-32 bg-indigo-50 dark:bg-indigo-900/20 animate-pulse rounded-xl"></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <TableSkeleton rows={4} />
                            <TableSkeleton rows={4} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-full">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 font-display">Daily Attendance Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Automated class attendance generated via AI vision</p>
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                        <Calendar className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Reports Available</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        There are no recorded sessions to display. Start an AI session from the Dashboard to automatically track attendance.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {reports.map((dateGroup, index) => (
                        <div key={index} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary-500 opacity-80"></div>

                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <Calendar className="w-6 h-6 text-primary-500" />
                                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                            {format(new Date(dateGroup.date), 'EEEE, MMMM d, yyyy')}
                                        </h2>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 ml-9">
                                        {dateGroup.sessions.length} class session{dateGroup.sessions.length !== 1 ? 's' : ''} recorded
                                    </p>
                                </div>

                                <button
                                    onClick={() => generatePDF(dateGroup)}
                                    className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-5 py-3 rounded-xl font-semibold transition-colors duration-200 shadow-sm"
                                >
                                    <Download className="w-5 h-5" />
                                    <span>Download PDF</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ml-4">
                                {dateGroup.sessions.map((session, sIndex) => (
                                    <div key={sIndex} className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center">
                                                    <BookOpen className="w-4 h-4 mr-2 text-slate-400" />
                                                    {session.className}
                                                    <span className="text-sm font-normal text-slate-500 ml-2 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">{session.subject || 'General'}</span>
                                                </h3>
                                                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                                                    <Clock className="w-4 h-4 mr-1.5" />
                                                    {format(new Date(session.startTime), 'h:mm a')} - {session.endTime ? format(new Date(session.endTime), 'h:mm a') : 'Now'}
                                                </div>
                                            </div>
                                            <div className="text-right bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Attendance</div>
                                                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                                    <span className="text-green-500">{session.presentCount}</span> / {session.totalCount}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                                        <tr>
                                                            <th className="px-4 py-3 font-semibold">Roll No.</th>
                                                            <th className="px-4 py-3 font-semibold">Name</th>
                                                            <th className="px-4 py-3 font-semibold">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                        {session.attendance.map((student, tIndex) => (
                                                            <tr key={tIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-4 py-3 text-slate-500 font-medium">#{student.rollNumber}</td>
                                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{student.name}</td>
                                                                <td className="px-4 py-3">
                                                                    {student.status === 'Present' ? (
                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                                                                            Present
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                                                                            Absent
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AttendanceReports;
