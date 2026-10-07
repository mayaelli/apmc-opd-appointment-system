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

  // Track if there are unsaved changes (steps 2-3 with data)
  useEffect(() => {
    if (currentStep === 4) {
      // On ticket view, no unsaved changes
      setHasUnsavedChanges(false);
    } else if (currentStep === 1 && !selectedCategory) {
      // Step 1 with no selection
      setHasUnsavedChanges(false);
    } else if (currentStep === 2 && (scheduleData.office || scheduleData.date || scheduleData.slot)) {
      // Step 2 with any schedule data
      setHasUnsavedChanges(true);
    } else if (currentStep === 3) {
      // Step 3 patient details form
      setHasUnsavedChanges(true);
    } else if (currentStep === 1 && selectedCategory) {
      // Step 1 with category selected
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [currentStep, selectedCategory, scheduleData, patientDetails]);

  // Browser back/refresh protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 10-minute session timeout (9min warning, then 1min countdown)
  useEffect(() => {
    // Only start timer if we're in the booking flow (steps 1-3) and not on ticket
    if (currentStep >= 1 && currentStep <= 3) {
      let inactivityTimer: NodeJS.Timeout;
      let warningTimer: NodeJS.Timeout;
      let countdownInterval: NodeJS.Timeout;
      let lastActivity = Date.now();

      const TOTAL_TIME = 10 * 60 * 1000; // 10 minutes
      const WARNING_TIME = 9 * 60 * 1000; // Show warning at 9 minutes
      const COUNTDOWN_DURATION = 60; // 60 seconds countdown

      const resetTimers = () => {
        lastActivity = Date.now();
        setShowTimeoutWarning(false);
        clearTimeout(warningTimer);
        clearTimeout(inactivityTimer);
        clearInterval(countdownInterval);

        // Show warning after 9 minutes
        warningTimer = setTimeout(() => {
          setShowTimeoutWarning(true);
          setRemainingSeconds(COUNTDOWN_DURATION);

          // Start countdown
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

        // Timeout and redirect after 10 minutes
        inactivityTimer = setTimeout(() => {
          handleTimeout();
        }, TOTAL_TIME);
      };

      const handleTimeout = () => {
        alert('Your session has timed out due to inactivity. Please start a new appointment.');
        router.push('/');
      };

      const handleActivity = () => {
        if (!showTimeoutWarning) {
          resetTimers();
        }
      };

      // Track user activity
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('touchstart', handleActivity);

      resetTimers();

      return () => {
        clearTimeout(warningTimer);
        clearTimeout(inactivityTimer);
        clearInterval(countdownInterval);
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
      };
    }
  }, [currentStep, showTimeoutWarning, router]);

  // Step 1 handlers
  function handleCategorySelect(category: AppointmentCategory) {
    setSelectedCategory(category);
  }

  function handleStep1Next() {
    setCurrentStep(2);
  }

  // Step 2 handlers
  function handleStep2Back() {
    if (scheduleData.office || scheduleData.date || scheduleData.slot) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to go back? Your selected schedule will be lost.'
      );
      if (!confirmed) return;
    }
    setScheduleData({ office: '', date: '', slot: '' });
    setCurrentStep(1);
  }

  function handleStep2Next() {
    setCurrentStep(3);
  }

  // Step 3 handler — generates ticket on completion
  function handleStep3Back() {
    const confirmed = window.confirm(
      'You have unsaved changes. Are you sure you want to go back? Your entered patient details will be lost.'
    );
    if (!confirmed) return;
    setCurrentStep(2);
  }

  function handleStep3Next(details: NewCheckupDetails | FollowUpDetails | PhilHealthYakapDetails) {
    const queueId = generateQueueId(selectedCategory!, scheduleData.date);
    setPatientDetails(details);
    setTicket({ queueId });
    setCurrentStep(4);
  }

  // Reset everything
  function handleReset() {
    setCurrentStep(1);
    setSelectedCategory(null);
    setScheduleData({ office: '', date: '', slot: '' });
    setPatientDetails(null);
    setTicket(null);
    setShowTimeoutWarning(false);
  }

  function handleContinueSession() {
    setShowTimeoutWarning(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />

      {/* Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-sm shadow-2xl max-w-lg w-full p-8 border-t-[6px] border-red-600">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-3xl">⏱</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Session Timeout Warning</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Your session will expire due to inactivity. Continue working to stay logged in.
                </p>
              </div>
            </div>

            <div className="bg-red-600 rounded-sm p-6 mb-4">
              <p className="text-center">
                <span className="text-6xl font-mono font-black text-white block">{remainingSeconds}</span>
                <span className="text-sm text-white block mt-2">seconds remaining</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleContinueSession}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white uppercase font-bold tracking-wide py-3 px-4 rounded-sm transition-colors"
              >
                Continue Session
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 border-2 border-slate-300 hover:bg-slate-50 text-slate-700 uppercase font-bold tracking-wide py-3 px-4 rounded-sm transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb bar */}
      <div className="bg-slate-800 py-3 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-slate-300">Home › Appointment Booking</p>
        </div>
      </div>

      {/* Page title section */}
      <div className="bg-slate-900 py-6 border-b-4 border-emerald-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-white">OPD Appointment System</h1>
          <p className="text-sm text-slate-300 mt-1">
            Complete all steps to secure your digital queue pass.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Two-column layout: sidebar LEFT (1/3), content RIGHT (2/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar column — LEFT */}
          <div className="lg:col-span-1 lg:sticky lg:top-28 h-fit">
            <BookingSidebarTracker currentStep={currentStep} />
          </div>

          {/* Content column — RIGHT */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-300 rounded-sm shadow-lg p-8">
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
