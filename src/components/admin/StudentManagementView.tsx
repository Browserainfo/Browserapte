/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Key, 
  CheckCircle, 
  XCircle, 
  Edit2, 
  Eye, 
  Copy, 
  Check, 
  RefreshCw,
  UserCheck,
  Shield,
  Clock
} from 'lucide-react';
import { apiService } from '../../services/apiService';

interface StudentManagementViewProps {
  onOpenEnrolmentForm: () => void;
  onViewStudentSubmissions?: (studentId: string) => void;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  onOpenEnrolmentForm,
  onViewStudentSubmissions
}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state matching Screenshot 3
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | 'All'>('Active');
  const [programFilter, setProgramFilter] = useState<string>('All');
  const [batchFilter, setBatchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Password Reset Modal State
  const [resetModalStudent, setResetModalStudent] = useState<any | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getStudents();
      setStudents(Array.isArray(data) ? data : []);
      setIsLoading(false);
    } catch (err: any) {
      console.warn('Notice fetching student directory:', err);
      setError(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleToggleStatus = async (student: any) => {
    const newStatus = student.accountStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiService.updateStudentStatus(student.id, newStatus);
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, accountStatus: newStatus } : s));
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleOpenResetPassword = (student: any) => {
    setResetModalStudent(student);
    setNewTempPassword(String(Math.floor(10000 + Math.random() * 90000)));
    setResetSuccessMessage(null);
  };

  const handleExecuteResetPassword = async () => {
    if (!resetModalStudent) return;
    setIsResetting(true);
    try {
      const res = await apiService.resetPassword(resetModalStudent.id, newTempPassword);
      setIsResetting(false);
      setResetSuccessMessage(res.message);
      // Update in local state
      setStudents(prev => prev.map(s => s.id === resetModalStudent.id ? { ...s } : s));
    } catch (err: any) {
      setIsResetting(false);
      alert(`Error resetting password: ${err.message}`);
    }
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesStatus = statusFilter === 'All' || s.accountStatus === statusFilter;
    const matchesProgram = programFilter === 'All' || 
      (s.course && s.course.toLowerCase().includes(programFilter.toLowerCase())) ||
      (s.courseType && s.courseType.toLowerCase().includes(programFilter.toLowerCase()));
    const matchesBatch = batchFilter === 'All' || s.batch === batchFilter;
    const matchesSearch = !searchQuery.trim() || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.contact && s.contact.includes(searchQuery));

    return matchesStatus && matchesProgram && matchesBatch && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header matching Screenshot 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">View Students</h1>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-amber-700 font-semibold">View Students</span>
          </div>
        </div>

        <button
          onClick={onOpenEnrolmentForm}
          className="bg-[#1c2431] hover:bg-black text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>ENROL STUDENT</span>
        </button>
      </div>

      {/* Filters Box matching Screenshot 3 */}
      <div className="bg-[#1c2431] text-white p-5 rounded-2xl border border-slate-700 shadow space-y-4 text-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          <span>FILTERS:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          
          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">STATUS</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-white text-slate-900 text-xs px-3 py-2 rounded-full border border-slate-300 font-medium"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="All">All</option>
            </select>
          </div>

          {/* Program */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">PROGRAM</label>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full bg-white text-slate-900 text-xs px-3 py-2 rounded-full border border-slate-300 font-medium"
            >
              <option value="All">--All Programs--</option>
              <option value="CD-IELTS">CD-IELTS</option>
              <option value="PTE">PTE Academic</option>
              <option value="CELPIP">CELPIP</option>
              <option value="Spoken">Spoken English</option>
              <option value="Computer">Computer Courses</option>
            </select>
          </div>

          {/* Batch */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">BATCH</label>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full bg-white text-slate-900 text-xs px-3 py-2 rounded-full border border-slate-300 font-medium"
            >
              <option value="All">--All Batches--</option>
              <option value="CD-IELTS_Academic_default">CD-IELTS_Academic_default</option>
              <option value="PTE_Target_79_default">PTE_Target_79_default</option>
              <option value="Morning IELTS Master 7.5+">Morning IELTS Master 7.5+</option>
              <option value="Evening PTE Intensive">Evening PTE Intensive</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">SEARCH CANDIDATES</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by student name, ID (e.g. CR39), username or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-slate-900 text-xs px-4 py-2 pl-9 rounded-full border border-slate-300 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

        </div>
      </div>

      {/* Students Data Table matching Screenshot 3 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1c2431] text-white font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Enrolled Date<br /><span className="text-[10px] font-normal text-slate-400">Course Start Date</span></th>
                <th className="py-3 px-3">Student ID</th>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Contact<br /><span className="text-[10px] font-normal text-slate-400">Username / Pass</span></th>
                <th className="py-3 px-3">Course & Pack</th>
                <th className="py-3 px-3">Batch</th>
                <th className="py-3 px-3">Fee</th>
                <th className="py-3 px-3">Discount</th>
                <th className="py-3 px-3 text-center">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student, idx) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                  
                  {/* Dates */}
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-800">{student.enrolmentDate}</div>
                    <div className="text-[10px] text-slate-400">{student.courseStartDate || student.enrolmentDate}</div>
                  </td>

                  {/* Student ID */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono text-xs">
                      {student.studentId || 'N/A'}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{student.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{student.gender} • {student.dob || ''}</div>
                  </td>

                  {/* Contact / Username / Password */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="text-slate-800 font-semibold">{student.contact}</div>
                    <div className="text-sky-700 font-bold">{student.username}</div>
                    <div className="text-slate-400 text-[10px]" title="Password securely hashed">Pass: ••••••</div>
                  </td>

                  {/* Course & Pack */}
                  <td className="py-3 px-3 max-w-xs">
                    <div className="font-semibold text-slate-900">{student.course || 'CD-IELTS'}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-2 leading-tight mt-0.5">
                      {student.pack || 'CD-IELTS AC Pay Per Use Pack'}
                    </div>
                  </td>

                  {/* Batch */}
                  <td className="py-3 px-3">
                    <span className="text-[11px] text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {student.batch || 'Default'}
                    </span>
                  </td>

                  {/* Fee */}
                  <td className="py-3 px-3 font-bold text-slate-900">
                    ₹{student.fee !== undefined ? student.fee : 1}
                  </td>

                  {/* Discount */}
                  <td className="py-3 px-3 text-slate-500">
                    ₹{student.discount || 0}
                  </td>

                  {/* Status Toggle & Actions matching Screenshot 3 */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Active / Inactive Toggle Switch */}
                      <button
                        onClick={() => handleToggleStatus(student)}
                        title={student.accountStatus === 'Active' ? 'Click to Deactivate' : 'Click to Activate'}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                          student.accountStatus === 'Active' ? 'bg-sky-500' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                          student.accountStatus === 'Active' ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>

                      {/* Reset Credentials button */}
                      <button
                        onClick={() => handleOpenResetPassword(student)}
                        title="Reset Student Password"
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {/* View Student Tests */}
                      {onViewStudentSubmissions && (
                        <button
                          onClick={() => onViewStudentSubmissions(student.studentId || student.id)}
                          title="View Test Attempts"
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-[9px] font-bold uppercase mt-1 text-slate-400">
                      {student.accountStatus}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400 text-xs">
                    No enrolled students found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESET PASSWORD MODAL */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reset Student Credentials</h3>
                <p className="text-xs text-slate-500">
                  {resetModalStudent.name} (ID: {resetModalStudent.studentId || resetModalStudent.id})
                </p>
              </div>
            </div>

            {resetSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Password Reset Successfully!</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200 font-mono space-y-1">
                  <div>Username: <strong className="text-slate-900">{resetModalStudent.username}</strong></div>
                  <div className="flex items-center justify-between">
                    <span>New Password: <strong className="text-emerald-700">{newTempPassword}</strong></span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newTempPassword);
                        setCopiedPass(true);
                        setTimeout(() => setCopiedPass(false), 2000);
                      }}
                      className="text-slate-500 hover:text-black p-1"
                    >
                      {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setResetModalStudent(null)}
                  className="w-full mt-2 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">New Temporary Password</label>
                  <input
                    type="text"
                    value={newTempPassword}
                    onChange={(e) => setNewTempPassword(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setResetModalStudent(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteResetPassword}
                    disabled={isResetting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow transition"
                  >
                    {isResetting ? 'Updating...' : 'Confirm Reset Password'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
