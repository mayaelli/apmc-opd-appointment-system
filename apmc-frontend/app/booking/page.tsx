'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BookingSidebarTracker from '@/components/booking/BookingSidebarTracker';
import CategorySelector from '@/components/booking/CategorySelector';
import SchedulePickerView from '@/components/booking/SchedulePickerView';
import PatientDetailsView from '@/components/booking/PatientDetailsView';
import AppointmentTicketView from '@/components/booking/AppointmentTicketView';
import {
  AppointmentCategory,
  BaseAppointmentDetails,
  NewCheckupDetails,
  FollowUpDetails,
  PhilHealthYakapDetails,
} from '@/app/types/appointment';

const CATEGORY_CODES: Record<AppointmentCategory, string> = {
  'new-checkup': 'NCC',
  'follow-up': 'FUC',
  'philhealth-yakap': 'PHY',
};

function generateQueueId(category: AppointmentCategory, date: string): string {
  const code = CATEGORY_CODES[category];
  const datePart = date.replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 9999 + 1)
    .toString()
    .padStart(4, '0');
  return `APMC-${code}-${datePart}-${randomPart}`;
}

export default function BookingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<AppointmentCategory | null>(null);
  const [scheduleData, setScheduleData] = useState({ office: '', date: '', slot: '' });
  const [patientDetails, setPatientDetails] = useState<
    NewCheckupDetails | FollowUpDetails | PhilHealthYakapDetails | null
  >(null);
  const [ticket, setTicket] = useState<{ queueId: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Track if there are unsaved changes
  useEffect(() => {
    if (currentStep === 4 || (currentStep === 1 && !selectedCategory)) {
      setHasUnsavedChanges(false);
    } else {
      setHasUnsavedChanges(true);
    }
  }, [currentStep, selectedCategory, scheduleData, patientDetails]);

  // Browser back/refresh protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 10-minute session timeout logic
  useEffect(() => {
    if (currentStep >= 1 && currentStep <= 3) {
      let inactivityTimer: NodeJS.Timeout;
      let warningTimer: NodeJS.Timeout;
      let countdownInterval: NodeJS.Timeout;

      const TOTAL_TIME = 10 * 60 * 1000;
      const WARNING_TIME = 9 * 60 * 1000;
      const COUNTDOWN_DURATION = 60;

      const resetTimers = () => {
        setShowTimeoutWarning(false);
        clearTimeout(warningTimer);
        clearTimeout(inactivityTimer);
        clearInterval(countdownInterval);

        warningTimer = setTimeout(() => {
          setShowTimeoutWarning(true);
          setRemainingSeconds(COUNTDOWN_DURATION);

          countdownInterval = setInterval(() => {
            setRemainingSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, WARNING_TIME);

        inactivityTimer = setTimeout(() => {
          alert('Your session has timed out due to inactivity.');
          router.push('/');
        }, TOTAL_TIME);
      };

      const handleActivity = () => {
        if (!showTimeoutWarning) resetTimers();
      };

      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);

      resetTimers();

      return () => {
        clearTimeout(warningTimer);
        clearTimeout(inactivityTimer);
        clearInterval(countdownInterval);
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
      };
    }
  }, [currentStep, showTimeoutWarning, router]);

  function handleCategorySelect(category: AppointmentCategory) {
    setSelectedCategory(category);
  }

  function handleStep1Next() {
    setCurrentStep(2);
  }

  function handleStep2Back() {
    if (scheduleData.office || scheduleData.date || scheduleData.slot) {
      if (!window.confirm('You have unsaved schedule changes. Go back?')) return;
    }
    setScheduleData({ office: '', date: '', slot: '' });
    setCurrentStep(1);
  }

  function handleStep2Next() {
    setCurrentStep(3);
  }

  function handleStep3Back() {
    if (!window.confirm('You have unsaved patient details. Go back?')) return;
    setCurrentStep(2);
  }

  function handleStep3Next(details: NewCheckupDetails | FollowUpDetails | PhilHealthYakapDetails) {
    const queueId = generateQueueId(selectedCategory!, scheduleData.date);
    setPatientDetails(details);
    setTicket({ queueId });
    setCurrentStep(4);
  }

  function handleReset() {
    setCurrentStep(1);
    setSelectedCategory(null);
    setScheduleData({ office: '', date: '', slot: '' });
    setPatientDetails(null);
    setTicket(null);
    setShowTimeoutWarning(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      {/* Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-sm shadow-2xl max-w-lg w-full p-8 border-t-[6px] border-red-600">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Session Timeout Warning</h2>
            <p className="text-sm text-slate-600 mb-4">Your session is about to expire due to inactivity.</p>
            <div className="bg-red-600 rounded-sm p-6 mb-4 text-center">
              <span className="text-5xl font-mono font-black text-white">{remainingSeconds}s</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTimeoutWarning(false)}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-sm"
              >
                Continue Session
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-sm"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Main Container - Directly under Header */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Sidebar Tracker (Left 1/3) */}
          <div className="lg:col-span-1 lg:sticky lg:top-28">
            <BookingSidebarTracker currentStep={currentStep} />
          </div>

          {/* Dynamic Workspace (Right 2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 sm:p-8">
              {currentStep === 1 && (
                <CategorySelector
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleCategorySelect}
                  onNext={handleStep1Next}
                />
              )}

              {currentStep === 2 && selectedCategory && (
                <SchedulePickerView
                  category={selectedCategory}
                  selectedOffice={scheduleData.office}
                  selectedDate={scheduleData.date}
                  selectedSlot={scheduleData.slot}
                  onOfficeChange={(v) => setScheduleData((p) => ({ ...p, office: v }))}
                  onDateChange={(v) => setScheduleData((p) => ({ ...p, date: v }))}
                  onSlotChange={(v) => setScheduleData((p) => ({ ...p, slot: v }))}
                  onNext={handleStep2Next}
                  onBack={handleStep2Back}
                />
              )}

              {currentStep === 3 && selectedCategory && (
                <PatientDetailsView
                  category={selectedCategory}
                  onNext={handleStep3Next}
                  onBack={handleStep3Back}
                />
              )}

              {currentStep === 4 && ticket && selectedCategory && (
                <AppointmentTicketView
                  queueId={ticket.queueId}
                  patientName={(patientDetails as BaseAppointmentDetails)?.fullName ?? ''}
                  category={selectedCategory}
                  office={scheduleData.office}
                  date={scheduleData.date}
                  slot={scheduleData.slot}
                  onReset={handleReset}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}