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
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double submission

  // Reset everything when component mounts (fresh start each time)
  useEffect(() => {
    // Clear any leftover state from sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('apmc_booking_state');
    }
    
    // Force reset if we're showing completed ticket on mount
    // This handles the case where user bookmarks /booking or returns via browser history
    if (currentStep === 4) {
      setCurrentStep(1);
      setSelectedCategory(null);
      setScheduleData({ office: '', date: '', slot: '' });
      setPatientDetails(null);
      setTicket(null);
      setShowTimeoutWarning(false);
      setIsSubmitting(false);
    }
  }, []); // Empty deps = run once on mount
  
  // Clear state when successfully moving to ticket
  useEffect(() => {
    if (currentStep === 4 && ticket) {
      // Mark that we've shown this ticket
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('apmc_last_ticket', ticket.queueId);
      }
    }
  }, [currentStep, ticket]);

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
        e.returnValue = '⚠️ You have unsaved appointment data. Are you sure you want to leave?';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (currentStep === 4) {
        // On ticket page - completely block back button
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        alert(
          '⚠️ Cannot Go Back From Ticket Page\n\n' +
          'You have completed your booking. Please save your ticket and click "Return to Homepage".\n\n' +
          'Using the back button is disabled to prevent accidental data loss.'
        );
        return;
      }
      
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          '⚠️ Warning: Leaving Will Lose Your Progress\n\n' +
          'You are in the middle of booking an appointment. Using the back button will lose all your entered information.\n\n' +
          'Are you sure you want to leave?'
        );
        if (!confirmed) {
          // Push current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    // Add history state on mount and when step changes
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, currentStep]);

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
      const confirmed = window.confirm(
        '⚠️ Warning: Going Back Will Lose Your Schedule\n\n' +
        'You have selected:\n' +
        `• Office: ${scheduleData.office}\n` +
        `• Date: ${scheduleData.date}\n` +
        `• Time: ${scheduleData.slot}\n\n` +
        'Are you sure you want to go back? All this information will be lost.'
      );
      if (!confirmed) return;
    }
    setScheduleData({ office: '', date: '', slot: '' });
    setCurrentStep(1);
  }

  function handleStep2Next() {
    setCurrentStep(3);
  }

  function handleStep3Back() {
    const confirmed = window.confirm(
      '⚠️ Warning: Going Back Will Lose Your Patient Information\n\n' +
      'You have filled out the patient intake form. Going back will erase all entered information.\n\n' +
      'Are you sure you want to go back?'
    );
    if (!confirmed) return;
    setCurrentStep(2);
  }

  async function handleStep3Next(details: NewCheckupDetails | FollowUpDetails | PhilHealthYakapDetails) {
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ Already submitting, ignoring duplicate call');
      return;
    }

    setIsSubmitting(true);
    
    // Generate queue ID
    const queueId = generateQueueId(selectedCategory!, scheduleData.date);
    
    // Show loading state (you could add a loading modal here)
    try {
      // Save to Supabase via API - map phone to contactNumber
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          office: scheduleData.office,
          date: scheduleData.date,
          slot: scheduleData.slot,
          fullName: details.fullName,
          contactNumber: details.phone, // Map phone to contactNumber
          age: 'age' in details ? details.age : undefined,
          sex: 'sex' in details ? details.sex : undefined,
          chiefComplaint: 'chiefComplaint' in details ? details.chiefComplaint : undefined,
          previousDoctor: 'previousDoctorOrDepartment' in details ? details.previousDoctorOrDepartment : undefined,
          followUpPurpose: 'purpose' in details ? details.purpose : undefined,
          philhealthPin: 'philhealthPin' in details ? details.philhealthPin : undefined,
          serviceType: 'serviceType' in details ? details.serviceType : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle API errors
        setIsSubmitting(false);
        alert(`❌ Booking Failed\n\n${result.error || 'Unable to book appointment. Please try again.'}`);
        return;
      }

      // Success - show ticket
      setPatientDetails(details);
      setTicket({ queueId: result.queueId });
      setCurrentStep(4);
      setIsSubmitting(false);
      
      // Don't show alert - let user take screenshot peacefully
      
    } catch (error) {
      console.error('Booking error:', error);
      setIsSubmitting(false);
      alert('❌ Network Error\n\nUnable to connect to the server. Please check your internet connection and try again.');
    }
  }

  function handleReset() {
    // Confirm before leaving ticket
    const confirmed = window.confirm(
      '📸 Have you saved your ticket?\n\n' +
      'Please make sure you have:\n' +
      '✓ Taken a screenshot of your queue ticket\n' +
      '✓ Saved it for your records\n\n' +
      'Once you leave, you cannot view this ticket again.\n\n' +
      'Are you ready to return to the homepage?'
    );
    
    if (!confirmed) return;
    
    // Reset all state to start fresh
    setCurrentStep(1);
    setSelectedCategory(null);
    setScheduleData({ office: '', date: '', slot: '' });
    setPatientDetails(null);
    setTicket(null);
    setShowTimeoutWarning(false);
    setIsSubmitting(false);
    
    // Navigate to home
    router.push('/');
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

      {/* Loading Modal During Submission */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] px-4">
          <div className="bg-white rounded-sm shadow-2xl max-w-md w-full p-8 text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Processing Your Appointment</h3>
            <p className="text-slate-600 text-sm mb-4">
              Please wait while we save your booking information.
            </p>
            <p className="text-slate-500 text-xs">
              Do not close or refresh this page.
            </p>
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