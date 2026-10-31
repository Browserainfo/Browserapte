/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  HelpCircle, 
  Volume2, 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Sparkles,
  Maximize2,
  X
} from 'lucide-react';
import { 
  User, 
  ReadingTest, 
  ListeningTest, 
  WritingTask, 
  SpeakingTest, 
  ExamModule, 
  TestSubmission 
} from '../../types';
import { DataService } from '../../services/dataService';
import { apiService } from '../../services/apiService';
import { evaluateWritingSubmission, evaluateSpeakingSubmission } from '../../services/aiEvaluationService';
import { speechService } from '../../services/speechService';
import { PreTestAudioCheckModal } from '../common/PreTestAudioCheckModal';
import { findTestById } from '../../data/tests';

interface CdIeltsExamSimulatorProps {
  currentUser: User;
  initialModule?: ExamModule;
  testId?: string;
  onExit: () => void;
  onTestCompleted: (submission: TestSubmission) => void;
}

export const CdIeltsExamSimulator: React.FC<CdIeltsExamSimulatorProps> = ({
  currentUser,
  initialModule = 'reading',
  testId,
  onExit,
  onTestCompleted
}) => {
  const specificTest = testId ? findTestById(testId) : undefined;
  const initialResolvedModule: ExamModule = specificTest?.module && ['reading', 'listening', 'writing', 'speaking'].includes(specificTest.module.toLowerCase())
    ? (specificTest.module.toLowerCase() as ExamModule)
    : initialModule;

  const [activeModule, setActiveModule] = useState<ExamModule>(initialResolvedModule);

  // Appearance & Accessibility (Official CD-IELTS settings)
  const [fontSize, setFontSize] = useState<'standard' | 'large' | 'extralarge'>('standard');
  const [contrastTheme, setContrastTheme] = useState<'standard' | 'yellow_black' | 'blue_black'>('standard');

  // Test data sources
  const readingTests = DataService.getReadingTests();
  const currentReadingTest: ReadingTest = (specificTest && (specificTest.readingData || specificTest.readingTest)) || readingTests[0];

  const listeningTests = DataService.getListeningTests();
  const currentListeningTest: ListeningTest = (specificTest && (specificTest.listeningData || specificTest.listeningTest)) || listeningTests[0];

  const writingTasks = DataService.getWritingTasks();
  const currentWritingTask: WritingTask = (specificTest && (specificTest.writingData || specificTest.writingTask)) || writingTasks[1]; // Task 2 Essay

  const speakingTest: SpeakingTest = (specificTest && (specificTest.speakingData || specificTest.speakingTest)) || DataService.getSpeakingTest();

  // Test Execution State
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [activeQuestionNumber, setActiveQuestionNumber] = useState(1);
  const [writingEssay, setWritingEssay] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(20 * 60); // 20 mins for sample module
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-test Audio Device Check State
  const [pendingAudioCheckModule, setPendingAudioCheckModule] = useState<'listening' | 'speaking' | null>(
    initialResolvedModule === 'listening' ? 'listening' : initialResolvedModule === 'speaking' ? 'speaking' : null
  );
  const [verifiedAudioModules, setVerifiedAudioModules] = useState<{ listening: boolean; speaking: boolean }>({
    listening: false,
    speaking: false,
  });

  // Audio / Speaking specific state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [speakingPrepTime, setSpeakingPrepTime] = useState(60);
  const [speakingPrepActive, setSpeakingPrepActive] = useState(false);
  const [speakingRecording, setSpeakingRecording] = useState(false);
  const [speakingTranscript, setSpeakingTranscript] = useState('');
  const [speakingVolume, setSpeakingVolume] = useState(0);

  // Countdown timer (pauses while pre-test hardware check is being completed)
  useEffect(() => {
    if (secondsRemaining <= 0 || isTestSubmitted || pendingAudioCheckModule !== null) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining, isTestSubmitted, pendingAudioCheckModule]);

  // Handle module switching with hardware check gating
  const handleSelectModule = (mod: ExamModule) => {
    if (mod === 'listening' && !verifiedAudioModules.listening) {
      setPendingAudioCheckModule('listening');
      return;
    }
    if (mod === 'speaking' && !verifiedAudioModules.speaking) {
      setPendingAudioCheckModule('speaking');
      return;
    }
    setActiveModule(mod);
  };

  const handleAudioCheckPassed = () => {
    if (pendingAudioCheckModule === 'listening') {
      setVerifiedAudioModules(prev => ({ ...prev, listening: true }));
      setActiveModule('listening');
    } else if (pendingAudioCheckModule === 'speaking') {
      setVerifiedAudioModules(prev => ({ ...prev, speaking: true }));
      setActiveModule('speaking');
    }
    setPendingAudioCheckModule(null);
  };

  const handleAudioCheckCancelled = () => {
    if ((initialModule === 'listening' || initialModule === 'speaking') && !verifiedAudioModules[initialModule]) {
      onExit();
    } else {
      setPendingAudioCheckModule(null);
    }
  };

  // Speaking prep countdown
  useEffect(() => {
    let prepTimer: any = null;
    if (speakingPrepActive && speakingPrepTime > 0) {
      prepTimer = setInterval(() => {
        setSpeakingPrepTime(prev => prev - 1);
      }, 1000);
    } else if (speakingPrepTime === 0 && speakingPrepActive) {
      setSpeakingPrepActive(false);
      handleStartSpeakingRecording();
    }
    return () => clearInterval(prepTimer);
  }, [speakingPrepActive, speakingPrepTime]);

  const handleStartSpeakingPrep = () => {
    setSpeakingPrepTime(60);
    setSpeakingPrepActive(true);
  };

  const handleStartSpeakingRecording = async () => {
    setSpeakingPrepActive(false);
    setSpeakingRecording(true);

    const started = await speechService.startAudioRecording((vol) => {
      setSpeakingVolume(vol);
    });

    if (started) {
      speechService.startListening((payload) => {
        setSpeakingTranscript(payload.transcript);
      });
    } else {
      // Simulate input if mic not available
      setSpeakingTranscript("I would like to describe a significant project I recently accomplished, which was developing an environmental conservation campaign for our community.");
    }
  };

  const handleStopSpeakingRecording = async () => {
    setSpeakingRecording(false);
    speechService.stopListening();
    await speechService.stopAudioRecording();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleFlag = (qNum: number) => {
    setFlaggedQuestions(prev => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  const handleSelectAnswer = (qNum: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [qNum]: answer }));
  };

  // Submit test and calculate score / AI evaluation
  const handleSubmitTest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const submissionId = `sub_${Date.now()}`;
    const timeSpent = (20 * 60) - secondsRemaining;

    let newSubmission: TestSubmission;

    if (activeModule === 'reading') {
      const questions = currentReadingTest.questions;
      let correct = 0;
      const analysis = questions.map(q => {
        const userAns = (userAnswers[q.number] || '').trim();
        const correctAns = typeof q.correctAnswer === 'string' ? q.correctAnswer : q.correctAnswer[0];
        const isCorrect = userAns.toLowerCase() === correctAns.toLowerCase();
        if (isCorrect) correct++;
        return {
          questionNumber: q.number,
          userAnswer: userAns,
          correctAnswer: correctAns,
          isCorrect,
          explanation: q.explanation,
          category: q.type.replace(/_/g, ' ')
        };
      });

      // Raw band mapping for 8 sample questions
      const band = correct >= 7 ? 8.0 : correct >= 6 ? 7.0 : correct >= 4 ? 6.0 : 5.0;

      newSubmission = {
        id: submissionId,
        studentId: currentUser.id,
        studentName: currentUser.name,
        candidateNumber: currentUser.candidateNumber || 'CD-2026-9042',
        testTitle: currentReadingTest.title,
        courseType: currentReadingTest.courseType,
        module: 'reading',
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        timeSpentSeconds: timeSpent,
        totalQuestions: questions.length,
        correctCount: correct,
        rawBandScore: band,
        questionAnalysis: analysis,
        teacherReviewed: false
      };
    } else if (activeModule === 'writing') {
      const aiReport = await evaluateWritingSubmission(
        currentWritingTask.prompt,
        writingEssay || 'No response provided.',
        2
      );

      newSubmission = {
        id: submissionId,
        studentId: currentUser.id,
        studentName: currentUser.name,
        candidateNumber: currentUser.candidateNumber || 'CD-2026-9042',
        testTitle: currentWritingTask.title,
        courseType: currentWritingTask.courseType,
        module: 'writing',
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        timeSpentSeconds: timeSpent,
        writtenText: writingEssay,
        aiReport: aiReport,
        teacherReviewed: false
      };
    } else if (activeModule === 'speaking') {
      const aiReport = await evaluateSpeakingSubmission(
        speakingTest.part2CueCard.topic,
        speakingTranscript || 'Candidate gave speech response.',
        120
      );

      newSubmission = {
        id: submissionId,
        studentId: currentUser.id,
        studentName: currentUser.name,
        candidateNumber: currentUser.candidateNumber || 'CD-2026-9042',
        testTitle: speakingTest.title,
        courseType: 'ielts_academic',
        module: 'speaking',
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        timeSpentSeconds: 120,
        speechTranscript: speakingTranscript,
        aiReport: aiReport,
        teacherReviewed: false
      };
    } else {
      // Listening
      const questions = currentListeningTest.sections[0].questions;
      let correct = 0;
      const analysis = questions.map(q => {
        const userAns = (userAnswers[q.number] || '').trim();
        const correctAns = typeof q.correctAnswer === 'string' ? q.correctAnswer : q.correctAnswer[0];
        const isCorrect = userAns.toLowerCase() === correctAns.toLowerCase();
        if (isCorrect) correct++;
        return {
          questionNumber: q.number,
          userAnswer: userAns,
          correctAnswer: correctAns,
          isCorrect,
          explanation: q.explanation,
          category: 'Listening Comprehension'
        };
      });

      newSubmission = {
        id: submissionId,
        studentId: currentUser.id,
        studentName: currentUser.name,
        candidateNumber: currentUser.candidateNumber || 'CD-2026-9042',
        testTitle: currentListeningTest.title,
        courseType: currentListeningTest.courseType,
        module: 'listening',
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        timeSpentSeconds: timeSpent,
        totalQuestions: questions.length,
        correctCount: correct,
        rawBandScore: correct >= 4 ? 7.5 : 6.0,
        questionAnalysis: analysis,
        teacherReviewed: false
      };
    }

    DataService.saveSubmission(newSubmission);
    apiService.submitTest(newSubmission).catch(err => console.warn('Could not post submission to backend:', err));
    setIsTestSubmitted(true);
    setIsSubmitting(false);
    onTestCompleted(newSubmission);
  };

  // Determine container styling based on accessibility choices
  const getContainerStyles = () => {
    let classes = 'min-h-screen flex flex-col ';
    if (contrastTheme === 'yellow_black') {
      classes += 'bg-black text-yellow-300 ';
    } else if (contrastTheme === 'blue_black') {
      classes += 'bg-[#0f172a] text-sky-200 ';
    } else {
      classes += 'bg-[#f4f6f8] text-[#1e293b] ';
    }

    if (fontSize === 'large') {
      classes += 'text-base ';
    } else if (fontSize === 'extralarge') {
      classes += 'text-lg ';
    } else {
      classes += 'text-sm ';
    }
    return classes;
  };

  const wordsInEssay = writingEssay.trim().split(/\s+/).filter(Boolean).length;
  const questionsList = activeModule === 'reading' 
    ? currentReadingTest.questions 
    : currentListeningTest.sections[0].questions;

  return (
    <div className={getContainerStyles()}>
      
      {/* AUTHENTIC OFFICIAL CD-IELTS HEADER */}
      <header className="bg-[#1f2937] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-700 shadow select-none">
        
        {/* Candidate & Test ID */}
        <div className="flex items-center gap-4">
          <div className="border-r border-slate-600 pr-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Candidate Name</span>
            <span className="font-bold text-xs text-white">{currentUser.name}</span>
          </div>

          <div className="border-r border-slate-600 pr-4 hidden sm:block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Candidate Number</span>
            <span className="font-mono text-xs text-amber-400 font-bold">{currentUser.candidateNumber || 'CD-2026-9042'}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Exam Simulator</span>
            <span className="font-bold text-xs text-slate-200 uppercase">
              CD-IELTS • {activeModule}
            </span>
          </div>
        </div>

        {/* Accessibility & Timer Controls */}
        <div className="flex items-center gap-3">
          
          {/* Module Switcher in exam mode */}
          <div className="hidden lg:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => handleSelectModule('reading')}
              className={`px-2.5 py-1 rounded ${activeModule === 'reading' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
            >
              Reading
            </button>
            <button
              onClick={() => handleSelectModule('listening')}
              className={`px-2.5 py-1 rounded ${activeModule === 'listening' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
            >
              Listening
            </button>
            <button
              onClick={() => handleSelectModule('writing')}
              className={`px-2.5 py-1 rounded ${activeModule === 'writing' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
            >
              Writing
            </button>
            <button
              onClick={() => handleSelectModule('speaking')}
              className={`px-2.5 py-1 rounded ${activeModule === 'speaking' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
            >
              Speaking
            </button>
          </div>

          {/* Text Size (A-, A, A+) */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded border border-slate-700 text-[11px] font-bold">
            <button 
              onClick={() => setFontSize('standard')} 
              className={`px-2 py-1 ${fontSize === 'standard' ? 'bg-slate-700 text-amber-400' : 'text-slate-300'}`}
              title="Standard Font Size"
            >
              A
            </button>
            <button 
              onClick={() => setFontSize('large')} 
              className={`px-2 py-1 ${fontSize === 'large' ? 'bg-slate-700 text-amber-400' : 'text-slate-300'}`}
              title="Large Font Size"
            >
              A+
            </button>
          </div>

          {/* Contrast Mode */}
          <div className="hidden md:flex items-center bg-slate-800 rounded border border-slate-700 text-[11px] font-bold">
            <button
              onClick={() => setContrastTheme('standard')}
              className={`px-2 py-1 ${contrastTheme === 'standard' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              title="Standard Contrast"
            >
              Standard
            </button>
            <button
              onClick={() => setContrastTheme('yellow_black')}
              className={`px-2 py-1 ${contrastTheme === 'yellow_black' ? 'bg-black text-yellow-300 border border-yellow-400' : 'text-slate-400'}`}
              title="High Contrast (Yellow on Black)"
            >
              Yellow
            </button>
          </div>

          {/* Countdown Clock */}
          <div className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono font-bold text-xs ${
            secondsRemaining < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-amber-400 border border-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(secondsRemaining)} remaining</span>
          </div>

          {/* Finish Test Button */}
          <button
            onClick={handleSubmitTest}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow transition active:scale-95 flex items-center gap-1"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Evaluating...' : 'Finish Test'}</span>
          </button>

          <button
            onClick={onExit}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Exit Exam Simulator"
          >
            <X className="w-4 h-4" />
          </button>

        </div>
      </header>

      {/* MAIN SPLIT-SCREEN EXAM BODY */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* ================= READING MODULE ================= */}
        {activeModule === 'reading' && (
          <>
            {/* Left Column: Passage */}
            <div className="lg:w-1/2 p-6 overflow-y-auto border-r border-slate-300 max-h-[calc(100vh-120px)] bg-white cd-ielts-font leading-relaxed">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    READING PASSAGE 1
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 mt-1">
                    {currentReadingTest.passageTitle}
                  </h1>
                  {currentReadingTest.passageSubtitle && (
                    <p className="text-xs text-slate-600 italic mt-1">
                      {currentReadingTest.passageSubtitle}
                    </p>
                  )}
                </div>

                <div className="text-xs text-slate-800 whitespace-pre-line space-y-3 leading-loose select-text">
                  {currentReadingTest.passageText}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Questions */}
            <div className="lg:w-1/2 p-6 overflow-y-auto max-h-[calc(100vh-120px)] bg-slate-50 cd-ielts-font">
              <div className="max-w-2xl mx-auto space-y-6">
                
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <span className="font-semibold">Questions 1–8: Answer all questions in order.</span>
                  <button
                    onClick={() => toggleFlag(activeQuestionNumber)}
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded transition ${
                      flaggedQuestions[activeQuestionNumber] 
                        ? 'bg-amber-500 text-slate-950' 
                        : 'bg-white border border-amber-300 text-amber-800'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>{flaggedQuestions[activeQuestionNumber] ? 'Flagged for Review' : 'Flag Question'}</span>
                  </button>
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                  {currentReadingTest.questions.map((q) => (
                    <div 
                      key={q.id}
                      id={`q_anchor_${q.number}`}
                      className={`p-4 rounded-xl border transition ${
                        activeQuestionNumber === q.number
                          ? 'border-amber-500 bg-white shadow-md'
                          : 'border-slate-200 bg-white'
                      }`}
                      onClick={() => setActiveQuestionNumber(q.number)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] ${
                            userAnswers[q.number] ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {q.number}
                          </span>
                          <span>
                            {q.type === 'true_false_not_given' && 'Do the following statement agree with the text?'}
                            {q.type === 'fill_blank' && 'Complete the sentence with NO MORE THAN TWO WORDS:'}
                            {q.type === 'multiple_choice' && 'Choose the correct letter (A, B, C, or D):'}
                          </span>
                        </span>

                        {flaggedQuestions[q.number] && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                            Review
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 font-medium mb-3">
                        {q.questionText}
                      </p>

                      {/* True/False/Not Given Options */}
                      {q.type === 'true_false_not_given' && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt) => (
                            <label
                              key={opt}
                              className={`px-3 py-1.5 rounded-lg border cursor-pointer font-bold transition flex items-center gap-1.5 ${
                                userAnswers[q.number] === opt
                                  ? 'bg-amber-500 border-amber-600 text-slate-950'
                                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.number}`}
                                value={opt}
                                checked={userAnswers[q.number] === opt}
                                onChange={() => handleSelectAnswer(q.number, opt)}
                                className="sr-only"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Fill in Blank Input */}
                      {q.type === 'fill_blank' && (
                        <div>
                          <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={userAnswers[q.number] || ''}
                            onChange={(e) => handleSelectAnswer(q.number, e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Multiple Choice Options */}
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="space-y-1.5 text-xs">
                          {q.options.map((opt, i) => {
                            const letter = opt.substring(0, 1);
                            return (
                              <label
                                key={i}
                                className={`block p-2 rounded-lg border cursor-pointer transition ${
                                  userAnswers[q.number] === letter
                                    ? 'bg-amber-50 border-amber-400 font-semibold text-slate-900'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${q.number}`}
                                  value={letter}
                                  checked={userAnswers[q.number] === letter}
                                  onChange={() => handleSelectAnswer(q.number, letter)}
                                  className="mr-2"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  ))}
                </div>

              </div>
            </div>
          </>
        )}

        {/* ================= LISTENING MODULE ================= */}
        {activeModule === 'listening' && (
          <>
            <div className="lg:w-1/2 p-6 overflow-y-auto border-r border-slate-300 max-h-[calc(100vh-120px)] bg-white space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                  SECTION 1 AUDIO TRACK
                </span>
                <h1 className="text-xl font-bold text-slate-900 mt-1">
                  {currentListeningTest.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Simulated British Council Audio Stream • Single Play Only
                </p>
              </div>

              {/* Simulated Audio Player */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAudioPlaying(!audioPlaying)}
                      className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition shadow"
                    >
                      {audioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                    <div>
                      <div className="text-xs font-bold">Track 01: West Park Adult Center Enrollment</div>
                      <div className="text-[10px] text-slate-400">Duration: 04:00 • Clear British Accent</div>
                    </div>
                  </div>
                  <Volume2 className="w-5 h-5 text-slate-400" />
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className={`h-full bg-amber-400 transition-all duration-300 ${audioPlaying ? 'w-2/3' : 'w-1/4'}`}></div>
                </div>
              </div>

              {/* Scenario Transcript Guide */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Audio Transcript Scenario
                </span>
                <p className="text-slate-600 leading-relaxed italic whitespace-pre-line text-[11px]">
                  {currentListeningTest.sections[0].transcript}
                </p>
              </div>
            </div>

            <div className="lg:w-1/2 p-6 overflow-y-auto max-h-[calc(100vh-120px)] bg-slate-50">
              <div className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Questions 1–5: Complete the Notes</h3>
                
                {currentListeningTest.sections[0].questions.map(q => (
                  <div key={q.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-900">Question {q.number}</span>
                    <p className="text-slate-700">{q.questionText}</p>
                    
                    {q.type === 'fill_blank' ? (
                      <input
                        type="text"
                        placeholder="Answer..."
                        value={userAnswers[q.number] || ''}
                        onChange={(e) => handleSelectAnswer(q.number, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    ) : (
                      <div className="space-y-1">
                        {q.options?.map((opt, i) => (
                          <label key={i} className="block p-1.5 border border-slate-200 rounded text-slate-700 text-xs">
                            <input
                              type="radio"
                              name={`lq_${q.number}`}
                              value={opt[0]}
                              checked={userAnswers[q.number] === opt[0]}
                              onChange={() => handleSelectAnswer(q.number, opt[0])}
                              className="mr-2"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ================= WRITING MODULE ================= */}
        {activeModule === 'writing' && (
          <>
            <div className="lg:w-1/2 p-6 overflow-y-auto border-r border-slate-300 max-h-[calc(100vh-120px)] bg-white space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  WRITING TASK 2 • DISCURSIVE ESSAY
                </span>
                <h1 className="text-xl font-bold text-slate-900 mt-1">
                  {currentWritingTask.title}
                </h1>
                <div className="flex gap-4 text-xs text-slate-500 mt-2">
                  <span>Suggested Time: {currentWritingTask.suggestedMinutes} minutes</span>
                  <span>•</span>
                  <span className="font-bold text-slate-800">Minimum {currentWritingTask.minWords} Words</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-800 space-y-3 leading-relaxed">
                <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Essay Topic & Instructions</span>
                <p className="font-serif text-sm font-medium text-slate-900 whitespace-pre-line leading-relaxed">
                  {currentWritingTask.prompt}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                <div className="font-bold">Assessment Rubrics Monitored:</div>
                <div className="text-[11px] text-amber-800">
                  • Task Response (TR) • Coherence and Cohesion (CC) • Lexical Resource (LR) • Grammatical Range & Accuracy (GRA)
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 p-6 flex flex-col max-h-[calc(100vh-120px)] bg-slate-50">
              <div className="flex items-center justify-between pb-2 text-xs">
                <span className="font-bold text-slate-700">Type Your Essay Below</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                    wordsInEssay >= 250 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {wordsInEssay} / 250 Words
                  </span>
                </div>
              </div>

              <textarea
                rows={18}
                value={writingEssay}
                onChange={(e) => setWritingEssay(e.target.value)}
                placeholder="Start typing your response here... (Ensure clear paragraph breaks)"
                className="flex-1 w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs leading-relaxed font-serif bg-white text-slate-900 resize-none shadow-inner"
              />

              <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Standard tab indentation and spell-check behavior.</span>
                <button
                  onClick={handleSubmitTest}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  Submit Essay for AI & Teacher Evaluation
                </button>
              </div>
            </div>
          </>
        )}

        {/* ================= SPEAKING MODULE ================= */}
        {activeModule === 'speaking' && (
          <div className="w-full p-6 sm:p-10 max-w-4xl mx-auto overflow-y-auto max-h-[calc(100vh-120px)] space-y-6">
            <div className="text-center space-y-2 border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                CD-IELTS Speaking Interactive Exam
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">{speakingTest.title}</h1>
              <p className="text-xs text-slate-500">
                Part 2: Candidate Cue Card (1 Minute Preparation • 2 Minutes Continuous Speech)
              </p>
            </div>

            {/* Cue Card Card */}
            <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[11px] font-bold uppercase text-slate-400">Candidate Cue Card Prompt</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {speakingTest.part2CueCard.topic}
                </h3>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">You should say:</p>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-700">
                  {speakingTest.part2CueCard.bulletPoints.map((bp, i) => (
                    <li key={i}>{bp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Countdown / Recording Controls */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl text-center space-y-4 border border-slate-800">
              
              {speakingPrepActive && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Preparation Time Remaining
                  </div>
                  <div className="text-4xl font-extrabold text-amber-400 font-mono">
                    00:{speakingPrepTime < 10 ? `0${speakingPrepTime}` : speakingPrepTime}
                  </div>
                  <p className="text-xs text-slate-400">Make notes on paper or organize your thoughts.</p>
                </div>
              )}

              {!speakingPrepActive && !speakingRecording && (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleStartSpeakingPrep}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs shadow transition active:scale-95"
                  >
                    Start 1-Minute Prep Countdown
                  </button>
                  <button
                    onClick={handleStartSpeakingRecording}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Skip prep and record immediately &rarr;
                  </button>
                </div>
              )}

              {speakingRecording && (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto animate-pulse">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Recording Your Response (Speaking in Progress)</div>
                    <div className="text-xs text-slate-400">Continuous speech analyzed for Fluency, Lexical Resource, GRA and Pronunciation</div>
                  </div>

                  {/* Waveform meter */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden max-w-md mx-auto">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                      style={{ width: `${Math.max(10, speakingVolume)}%` }}
                    ></div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left max-h-32 overflow-y-auto">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Candidate Speech Transcript</div>
                    <p className="text-xs text-slate-200 mt-1 font-serif">
                      {speakingTranscript || 'Listening for speech input...'}
                    </p>
                  </div>

                  <button
                    onClick={handleStopSpeakingRecording}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition border border-slate-700"
                  >
                    Complete Speaking Task
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* OFFICIAL CD-IELTS BOTTOM NAVIGATION BAR (FOR OBJECTIVE MODULES) */}
      {(activeModule === 'reading' || activeModule === 'listening') && (
        <footer className="bg-[#1f2937] text-white px-4 py-2 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Questions</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-md sm:max-w-xl py-1">
              {questionsList.map((q) => {
                const isAnswered = Boolean(userAnswers[q.number]);
                const isFlagged = Boolean(flaggedQuestions[q.number]);
                const isActive = activeQuestionNumber === q.number;

                return (
                  <button
                    key={q.number}
                    onClick={() => {
                      setActiveQuestionNumber(q.number);
                      document.getElementById(`q_anchor_${q.number}`)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-7 h-7 rounded text-[11px] font-bold relative transition flex items-center justify-center ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-white' 
                        : isAnswered 
                        ? 'bg-slate-700 text-white border border-slate-500' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span>{q.number}</span>
                    {isFlagged && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-1 -right-1"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeQuestionNumber > 1) {
                  setActiveQuestionNumber(prev => prev - 1);
                  document.getElementById(`q_anchor_${activeQuestionNumber - 1}`)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              disabled={activeQuestionNumber === 1}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (activeQuestionNumber < questionsList.length) {
                  setActiveQuestionNumber(prev => prev + 1);
                  document.getElementById(`q_anchor_${activeQuestionNumber + 1}`)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              disabled={activeQuestionNumber === questionsList.length}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </footer>
      )}

      {/* Pre-Test Equipment & Audio Device Check */}
      <PreTestAudioCheckModal
        isOpen={pendingAudioCheckModule !== null}
        moduleType={pendingAudioCheckModule || 'listening'}
        testTitle={pendingAudioCheckModule === 'speaking' ? 'CD-IELTS Speaking Module' : 'CD-IELTS Academic Listening Module'}
        onProceed={handleAudioCheckPassed}
        onCancel={handleAudioCheckCancelled}
      />

    </div>
  );
};
