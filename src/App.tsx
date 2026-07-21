import React, { useState, useEffect } from 'react';
import { JobEntry, Driver, UserRole } from './types';
import { INITIAL_JOBS, SHIFT_DRIVERS } from './data/mockData';
import RoleSelector from './components/RoleSelector';
import DriverView from './components/DriverView';
import AccountantView from './components/AccountantView';
import { Shield, Eye, Users, RefreshCw } from 'lucide-react';

const JOBS_STORAGE_KEY = 'icd_driver_jobs_v1';
const DRIVERS_STORAGE_KEY = 'icd_drivers_v1';

export default function App() {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);

  // Load from local storage or set defaults
  useEffect(() => {
    const storedJobs = localStorage.getItem(JOBS_STORAGE_KEY);
    if (storedJobs) {
      try {
        setJobs(JSON.parse(storedJobs));
      } catch (e) {
        setJobs(INITIAL_JOBS);
      }
    } else {
      setJobs(INITIAL_JOBS);
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(INITIAL_JOBS));
    }

    const storedDrivers = localStorage.getItem(DRIVERS_STORAGE_KEY);
    if (storedDrivers) {
      try {
        setDrivers(JSON.parse(storedDrivers));
      } catch (e) {
        setDrivers(SHIFT_DRIVERS);
      }
    } else {
      setDrivers(SHIFT_DRIVERS);
      localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(SHIFT_DRIVERS));
    }
  }, []);

  // Save to localStorage whenever jobs or drivers list changes
  const saveJobs = (newJobs: JobEntry[]) => {
    setJobs(newJobs);
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(newJobs));
  };

  const saveDrivers = (newDrivers: Driver[]) => {
    setDrivers(newDrivers);
    localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(newDrivers));
  };

  // CRUD handlers
  const handleAddJob = (jobPayload: Omit<JobEntry, 'id' | 'driverId' | 'driverName'>) => {
    if (!currentDriver) return;
    
    const newJob: JobEntry = {
      ...jobPayload,
      id: 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      driverId: currentDriver.id,
      driverName: currentDriver.name,
    };

    const updated = [newJob, ...jobs];
    saveJobs(updated);
  };

  // Add job from Accountant/Admin (who can select ANY driver)
  const handleAddJobAdmin = (newJob: JobEntry) => {
    const updated = [newJob, ...jobs];
    saveJobs(updated);
  };

  const handleUpdateJob = (updatedJob: JobEntry) => {
    const updated = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
    saveJobs(updated);
  };

  const handleDeleteJob = (jobId: string) => {
    const updated = jobs.filter(j => j.id !== jobId);
    saveJobs(updated);
  };

  const handleAddDriver = (name: string) => {
    const newDriver: Driver = {
      id: 'driver-' + Date.now(),
      name,
    };
    const updated = [...drivers, newDriver];
    saveDrivers(updated);
  };

  // Helper to reset and reload the initial mock data (for testing)
  const handleResetData = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại dữ liệu gốc từ hình mẫu của ICD Tân Cảng Hải Phòng?')) {
      setJobs(INITIAL_JOBS);
      setDrivers(SHIFT_DRIVERS);
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(INITIAL_JOBS));
      localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(SHIFT_DRIVERS));
      alert('Đã đặt lại dữ liệu thành công!');
    }
  };

  return (
    <div className="relative">
      
      {/* 1. Main views based on user state */}
      {currentRole === null && (
        <RoleSelector
          drivers={drivers}
          onSelectDriver={(driver) => {
            setCurrentDriver(driver);
            setCurrentRole('driver');
          }}
          onSelectAccountant={() => {
            setCurrentRole('accountant');
          }}
          onAddDriver={handleAddDriver}
        />
      )}

      {currentRole === 'driver' && currentDriver && (
        <DriverView
          currentDriver={currentDriver}
          onLogout={() => {
            setCurrentDriver(null);
            setCurrentRole(null);
          }}
          jobs={jobs}
          onAddJob={handleAddJob}
          onDeleteJob={handleDeleteJob}
        />
      )}

      {currentRole === 'accountant' && (
        <AccountantView
          jobs={jobs}
          drivers={drivers}
          onAddJob={handleAddJobAdmin}
          onUpdateJob={handleUpdateJob}
          onDeleteJob={handleDeleteJob}
        />
      )}

      {/* 2. Floating Live View Switcher for the demo evaluation (Hidden in Print) */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center space-x-2 bg-[#0b0f19]/95 hover:bg-[#0b0f19] border border-slate-800 p-2 rounded-xl shadow-2xl text-slate-100 backdrop-blur-md text-xs no-print select-none">
        <span className="text-[10px] font-black text-slate-400 px-1.5 py-0.5 border border-slate-800/80 rounded bg-slate-900/60">
          CHẾ ĐỘ XEM THỬ
        </span>
        
        <div className="flex gap-1">
          <button
            onClick={() => {
              setCurrentRole(null);
              setCurrentDriver(null);
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              currentRole === null 
                ? 'bg-blue-600 text-white shadow shadow-blue-600/20' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Đến trang Chọn vai trò / Cổng đăng nhập"
          >
            Cổng chính
          </button>
 
          <button
            onClick={() => {
              // Select Vũ Xuân Tuyên (ID: 1) as current driver
              const vxTuyen = drivers.find(d => d.id === '1') || drivers[0] || { id: '1', name: 'Vũ Xuân Tuyên' };
              setCurrentDriver(vxTuyen);
              setCurrentRole('driver');
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              currentRole === 'driver' 
                ? 'bg-blue-600 text-white shadow shadow-blue-600/20' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Xem màn hình điện thoại của tài xế Vũ Xuân Tuyên"
          >
            Lái xe (Vũ Xuân Tuyên)
          </button>
 
          <button
            onClick={() => {
              setCurrentRole('accountant');
              setCurrentDriver(null);
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              currentRole === 'accountant' 
                ? 'bg-blue-600 text-white shadow shadow-blue-600/20' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Xem màn hình báo cáo của quản lý, kế toán"
          >
            Kế toán & Báo cáo
          </button>
        </div>
 
        <button
          onClick={handleResetData}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
          title="Đặt lại dữ liệu gốc mẫu"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
