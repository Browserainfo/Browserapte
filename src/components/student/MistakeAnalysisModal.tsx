/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  UserCheck, 
  Clock, 
  HelpCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { TestSubmission } from '../../types';

interface MistakeAnalysisModalProps {
  submission: TestSubmission | null;
  onClose: () => void;
}

export const MistakeAnalysisModal: React.FC<MistakeAnalysisModalProps> = ({
  submission,
  onClose
}) => {
  if (!submission) return null;

  const correctAnswersCount = submission.questionAnalysis 
    ? submission.questionAnalysis.filter(q => q.isCorrect).length 
    : submission.correctCount || 0;

  const totalQuestions = submission.questionAnalysis 
    ? submission.questionAnalysis.length 
    : submission.totalQuestions || 0;

  const displayBand = submission.teacherAdjustedBand ?? 
    submission.rawBandScore ?? 
    submission.aiReport?.overallBand ?? 
    7.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 border border-slate-200 my-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                Official Mistake Diagnostic Report
              </span>
              <span className="text-xs font-mono text-slate-500">
                Submitted {submission.submittedAt}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">{submission.testTitle}</h2>
            <p className="text-xs text-slate-500">
              Candidate: <span className="font-semibold text-slate-800">{submission.studentName}</span> ({submission.candidateNumber})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Summary Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            
            <div className="sm:border-r sm:border-slate-800 pr-4">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Overall Band Score</div>
              <div className="text-4xl font-extrabold text-amber-400 mt-1 flex items-baseline gap-1">
                <span>Band {displayBand}</span>
                <span className="text-xs text-slate-400 font-normal">/ 9.0</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-medium mt-1">
                {displayBand >= 7.5 ? 'Good User Plus (C1)' : displayBand >= 6.5 ? 'Competent User (B2)' : 'Modest User (B1)'}
              </div>
            </div>

            {totalQuestions > 0 ? (
              <div className="sm:border-r sm:border-slate-800 pr-4">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Accuracy Rate</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {correctAnswersCount} / {totalQuestions} Correct
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {Math.round((correctAnswersCount / totalQuestions) * 100)}% Raw Accuracy
                </div>
              </div>
            ) : (
              <div className="sm:border-r sm:border-slate-800 pr-4">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Word Count / Duration</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {submission.writtenText ? `${submission.writtenText.trim().split(/\s+/).length} Words` : `${Math.round(submission.timeSpentSeconds / 60)} Mins`}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Meets official threshold</div>
              </div>
            )}

            <div className="sm:border-r sm:border-slate-800 pr-4">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Teacher Verification</div>
              <div className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                {submission.teacherReviewed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Reviewed & Approved</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">Provisional AI Score</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {submission.teacherName ? `Examiner: ${submission.teacherName}` : 'Faculty check pending'}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Exam Module</div>
              <div className="text-sm font-bold text-amber-400 capitalize mt-1">
                {submission.courseType.replace(/_/g, ' ')}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold mt-1">
                {submission.module} Test
              </div>
            </div>

          </div>
        </div>

        {/* Teacher Feedback Note (If reviewed) */}
        {submission.teacherFeedbackNotes && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <UserCheck className="w-4 h-4" />
              <span>Certified Faculty Remarks ({submission.teacherName || 'Master Trainer'})</span>
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed font-medium">
              "{submission.teacherFeedbackNotes}"
            </p>
          </div>
        )}

        {/* AI Rubric Criteria Breakdown (For Writing / Speaking) */}
        {submission.aiReport && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Examiner Rubric Assessment ({submission.aiReport.modelUsed})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {submission.aiReport.criteriaScores.map((criterion, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900">{criterion.name}</span>
                    <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Band {criterion.score}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{criterion.description}</p>
                </div>
              ))}
            </div>

            {/* Strengths & Areas to Improve */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Strengths
                </span>
                <ul className="space-y-1 text-xs text-emerald-950">
                  {submission.aiReport.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Targeted Band Improvements
                </span>
                <ul className="space-y-1 text-xs text-amber-950">
                  {submission.aiReport.areasToImprove.map((area, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-600">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Vocabulary & Grammar Enhancements */}
            {submission.aiReport.grammarFixes && submission.aiReport.grammarFixes.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-2">
                <span className="text-xs font-bold text-slate-900">Grammar & Collocation Refinements:</span>
                {submission.aiReport.grammarFixes.map((fix, i) => (
                  <div key={i} className="text-xs space-y-0.5 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-slate-500 line-through text-[11px]">{fix.original}</div>
                    <div className="text-emerald-700 font-semibold">{fix.suggestion}</div>
                    <div className="text-slate-600 text-[10px] mt-0.5 italic">{fix.rule}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Written Essay Display if available */}
        {submission.writtenText && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Submitted Essay Text</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 leading-relaxed font-serif whitespace-pre-line max-h-56 overflow-y-auto">
              {submission.writtenText}
            </div>
          </div>
        )}

        {/* Objective Question-by-Question Mistake Breakdown (Reading / Listening) */}
        {submission.questionAnalysis && submission.questionAnalysis.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Detailed Question-by-Question Mistake Analysis ({submission.questionAnalysis.length} Questions)
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Correct: {correctAnswersCount}
                </span>
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Mistakes: {submission.questionAnalysis.length - correctAnswersCount}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {submission.questionAnalysis.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs transition ${
                    item.isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-red-50/40 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        Q{item.questionNumber}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {item.category}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.isCorrect ? 'Correct (+1)' : 'Mistake (0)'}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium">Your Answer: </span>
                      <span className={`font-bold ${item.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                        {item.userAnswer || '(Blank / Not answered)'}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium">Correct Key: </span>
                      <span className="font-bold text-slate-900">{item.correctAnswer}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="font-bold text-slate-900">Examiner Analysis: </span>
                    {item.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            Official BrowseraIELTS Diagnostic Record • Browsera Infotech
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
};
