import React, { useState } from 'react';
import {
  Plus, Trash2, Calculator,
  Ship, Ruler, Check, X, Loader2,
  MessageSquareText, Repeat, Mail, Pencil, Search,
  ChevronLeft, ChevronRight, Forklift, Container, KeyRound,
} from 'lucide-react';
import { Account, ConfigLists } from '../lib/api';
import { UserRole } from '../types';
import { stripDiacritics } from '../utils';

interface AdminSettingsViewProps {
  tab: 'users' | 'config';
  accounts: Account[];
  configLists: ConfigLists;
  onCreateAccount: (input: { username: string; fullName: string; role: UserRole; phone?: string; email?: string }) => Promise<Account>;
  onToggleAccountActive: (id: string, isActive: boolean) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onUpdateAccountEmail: (id: string, email: string) => Promise<void>;
  onSetDriverPin: (accountId: string, pin: string) => Promise<void>;
  onAddShippingLine: (code: string, name: string) => Promise<void>;
  onToggleShippingLine: (code: string, isActive: boolean) => Promise<void>;
  onAddContainerSize: (code: string, label: string) => Promise<void>;
  onToggleContainerSize: (code: string, isActive: boolean) => Promise<void>;
  onToggleOperationType: (code: string, isActive: boolean) => Promise<void>;
  onAddOperationType: (code: string, label: string) => Promise<void>;
  onAddDaoChuyenSubtype: (code: string, label: string) => Promise<void>;
  onToggleDaoChuyenSubtype: (code: string, isActive: boolean) => Promise<void>;
  onAddDaoChuyenNote: (code: string, label: string, subtypeCode: string) => Promise<void>;
  onToggleDaoChuyenNote: (code: string, isActive: boolean) => Promise<void>;
  onAddEquipmentType: (code: string, label: string) => Promise<void>;
  onToggleEquipmentType: (code: string, isActive: boolean) => Promise<void>;
  onAddContainerType: (code: string, label: string) => Promise<void>;
  onToggleContainerType: (code: string, isActive: boolean) => Promise<void>;
  onAddNotePreset: (label: string) => Promise<void>;
  onToggleNotePreset: (id: string, isActive: boolean) => Promise<void>;
  onDeleteNotePreset: (id: string) => Promise<void>;
}

const ROLE_LABEL: Record<UserRole, string> = {
  driver: 'Tài xế',
  accountant: 'Kế toán',
  admin: 'Admin',
};

export default function AdminSettingsView({
  tab,
  accounts,
  configLists,
  onCreateAccount,
  onToggleAccountActive,
  onDeleteAccount,
  onUpdateAccountEmail,
  onSetDriverPin,
  onAddShippingLine,
  onToggleShippingLine,
  onAddContainerSize,
  onToggleContainerSize,
  onToggleOperationType,
  onAddOperationType,
  onAddDaoChuyenSubtype,
  onToggleDaoChuyenSubtype,
  onAddDaoChuyenNote,
  onToggleDaoChuyenNote,
  onAddEquipmentType,
  onToggleEquipmentType,
  onAddContainerType,
  onToggleContainerType,
  onAddNotePreset,
  onToggleNotePreset,
  onDeleteNotePreset,
}: AdminSettingsViewProps) {
  const [busy, setBusy] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Chạy 1 thao tác thay đổi dữ liệu (xoá/bật-tắt) và khoá toàn bộ nút khác cho tới khi xong.
  const runAction = async (key: string, action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setActiveKey(key);
    try {
      await action();
    } finally {
      setBusy(false);
      setActiveKey(null);
    }
  };

  // New account form
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('driver');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserErrors, setAddUserErrors] = useState<{ username?: string; fullName?: string; pin?: string }>({});

  // Tìm kiếm + phân trang danh sách người dùng
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const USERS_PAGE_SIZE = 10;
  const filteredAccounts = userSearch
    ? accounts.filter((a) => {
        const q = stripDiacritics(userSearch);
        return (
          stripDiacritics(a.fullName).includes(q) ||
          stripDiacritics(a.username).includes(q) ||
          (a.phone ? stripDiacritics(a.phone).includes(q) : false) ||
          (a.email ? stripDiacritics(a.email).includes(q) : false)
        );
      })
    : accounts;
  const userTotalPages = Math.max(1, Math.ceil(filteredAccounts.length / USERS_PAGE_SIZE));
  const safeUserPage = Math.min(userPage, userTotalPages - 1);
  const pagedAccounts = filteredAccounts.slice(
    safeUserPage * USERS_PAGE_SIZE,
    safeUserPage * USERS_PAGE_SIZE + USERS_PAGE_SIZE
  );

  // Sửa email (Gmail) cho tài khoản đã tồn tại - cần cho đăng nhập Google (chế độ real)
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');

  // Đổi mã PIN cho tài xế đã có sẵn (dùng để chuyển ca nhanh trên iPad dùng chung)
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editingPinValue, setEditingPinValue] = useState('');
  const [editingPinError, setEditingPinError] = useState('');

  // New config item forms
  const [newLineCode, setNewLineCode] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newSizeCode, setNewSizeCode] = useState('');
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [newOpCode, setNewOpCode] = useState('');
  const [newOpLabel, setNewOpLabel] = useState('');
  const [newSubtypeCode, setNewSubtypeCode] = useState('');
  const [newSubtypeLabel, setNewSubtypeLabel] = useState('');
  const [newDaoChuyenNoteLabel, setNewDaoChuyenNoteLabel] = useState('');
  const [newDaoChuyenNoteSubtype, setNewDaoChuyenNoteSubtype] = useState('');
  const [newEquipmentCode, setNewEquipmentCode] = useState('');
  const [newEquipmentLabel, setNewEquipmentLabel] = useState('');
  const [newContainerTypeCode, setNewContainerTypeCode] = useState('');
  const [newContainerTypeLabel, setNewContainerTypeLabel] = useState('');
  const [newNoteLabel, setNewNoteLabel] = useState('');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { username?: string; fullName?: string; pin?: string } = {};
    if (!newUsername.trim()) errors.username = 'Bắt buộc nhập tài khoản.';
    if (!newFullName.trim()) errors.fullName = 'Bắt buộc nhập họ và tên.';
    if (newRole === 'driver' && !/^[0-9]{4}$/.test(newPin)) errors.pin = 'Mã PIN phải gồm đúng 4 chữ số.';
    setAddUserErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const account = await onCreateAccount({
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        role: newRole,
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
      });
      if (newRole === 'driver') {
        try {
          await onSetDriverPin(account.id, newPin);
        } catch (pinErr) {
          // Tài khoản đã tạo thành công, chỉ riêng bước đặt PIN lỗi (thường do chưa chạy
          // migration 0007_driver_pin.sql trên Supabase) - báo rõ để không tưởng nhầm là
          // form "không phản hồi gì".
          setAddUserErrors({ pin: `Đã tạo tài khoản nhưng đặt PIN thất bại: ${(pinErr as Error).message ?? pinErr}` });
          return;
        }
      }
      setNewUsername('');
      setNewFullName('');
      setNewPhone('');
      setNewEmail('');
      setNewPin('');
      setNewRole('driver');
      setAddUserErrors({});
      setShowAddUserModal(false);
    } catch (err) {
      setAddUserErrors({ username: (err as Error).message ?? String(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleSavePin = async (id: string) => {
    if (busy) return;
    if (!/^[0-9]{4}$/.test(editingPinValue)) {
      setEditingPinError('Mã PIN phải gồm đúng 4 chữ số.');
      return;
    }
    setBusy(true);
    try {
      await onSetDriverPin(id, editingPinValue);
      setEditingPinId(null);
      setEditingPinValue('');
      setEditingPinError('');
    } catch (err) {
      setEditingPinError((err as Error).message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEmail = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onUpdateAccountEmail(id, editingEmailValue.trim());
      setEditingEmailId(null);
    } finally {
      setBusy(false);
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineCode.trim() || !newLineName.trim()) return;
    setBusy(true);
    try {
      await onAddShippingLine(newLineCode.trim().toUpperCase(), newLineName.trim());
      setNewLineCode('');
      setNewLineName('');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeCode.trim() || !newSizeLabel.trim()) return;
    setBusy(true);
    try {
      await onAddContainerSize(newSizeCode.trim().toUpperCase(), newSizeLabel.trim());
      setNewSizeCode('');
      setNewSizeLabel('');
    } finally {
      setBusy(false);
    }
  };

  const handleAddOperationType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpCode.trim() || !newOpLabel.trim()) return;
    setBusy(true);
    try {
      await onAddOperationType(newOpCode.trim().toLowerCase().replace(/\s+/g, '_'), newOpLabel.trim());
      setNewOpCode('');
      setNewOpLabel('');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSubtype = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtypeCode.trim() || !newSubtypeLabel.trim()) return;
    setBusy(true);
    try {
      await onAddDaoChuyenSubtype(newSubtypeCode.trim().toLowerCase().replace(/\s+/g, '_'), newSubtypeLabel.trim());
      setNewSubtypeCode('');
      setNewSubtypeLabel('');
    } finally {
      setBusy(false);
    }
  };

  const handleAddDaoChuyenNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const subtypeCode = newDaoChuyenNoteSubtype || configLists.daoChuyenSubtypes[0]?.code;
    if (!newDaoChuyenNoteLabel.trim() || !subtypeCode) return;
    setBusy(true);
    try {
      const code = stripDiacritics(newDaoChuyenNoteLabel.trim()).replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await onAddDaoChuyenNote(code, newDaoChuyenNoteLabel.trim(), subtypeCode);
      setNewDaoChuyenNoteLabel('');
    } finally {
      setBusy(false);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipmentCode.trim() || !newEquipmentLabel.trim()) return;
    setBusy(true);
    try {
      await onAddEquipmentType(newEquipmentCode.trim().toUpperCase(), newEquipmentLabel.trim());
      setNewEquipmentCode('');
      setNewEquipmentLabel('');
    } finally {
      setBusy(false);
    }
  };

  const handleAddContainerType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContainerTypeCode.trim() || !newContainerTypeLabel.trim()) return;
    setBusy(true);
    try {
      await onAddContainerType(newContainerTypeCode.trim().toLowerCase().replace(/\s+/g, '_'), newContainerTypeLabel.trim());
      setNewContainerTypeCode('');
      setNewContainerTypeLabel('');
    } finally {
      setBusy(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteLabel.trim()) return;
    setBusy(true);
    try {
      await onAddNotePreset(newNoteLabel.trim());
      setNewNoteLabel('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="space-y-6">
        {tab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            {/* Search + Add user */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }}
                  placeholder="Tìm theo tên, tài khoản, SĐT, email..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-300 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none placeholder-slate-400 transition-colors"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => { setUserSearch(''); setUserPage(0); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setAddUserErrors({}); setShowAddUserModal(true); }}
                className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Người Dùng</span>
              </button>
            </div>

            {/* User list */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400 font-bold border-b border-slate-200">
                    <th className="py-2 pr-2">Họ và tên</th>
                    <th className="py-2 pr-2">Tài khoản</th>
                    <th className="py-2 pr-2">Vai trò</th>
                    <th className="py-2 pr-2">SĐT</th>
                    <th className="py-2 pr-2">Email Gmail</th>
                    <th className="py-2 pr-2">Trạng thái</th>
                    <th className="py-2 pr-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedAccounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        {userSearch ? 'Không tìm thấy người dùng phù hợp.' : 'Chưa có người dùng nào.'}
                      </td>
                    </tr>
                  )}
                  {pagedAccounts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-2 font-bold text-slate-800">{a.fullName}</td>
                      <td className="py-2 pr-2 font-mono text-slate-500">@{a.username}</td>
                      <td className="py-2 pr-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          a.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                          a.role === 'accountant' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {ROLE_LABEL[a.role]}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-slate-500">{a.phone || '-'}</td>
                      <td className="py-2 pr-2">
                        {editingEmailId === a.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="email"
                              value={editingEmailValue}
                              onChange={(e) => setEditingEmailValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail(a.id)}
                              placeholder="ten@gmail.com"
                              className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              onClick={() => handleSaveEmail(a.id)}
                              disabled={busy}
                              className="text-emerald-600 cursor-pointer disabled:opacity-40"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingEmailId(null)} className="text-slate-400 cursor-pointer">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingEmailId(a.id);
                              setEditingEmailValue(a.email ?? '');
                            }}
                            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 cursor-pointer group"
                            title="Sửa email"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                            <span className={a.email ? '' : 'italic text-slate-400'}>{a.email || 'Chưa gán'}</span>
                            <Pencil className="w-3 h-3 text-slate-300 group-hover:text-emerald-600" />
                          </button>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <button
                          onClick={() => runAction(`acc-${a.id}`, () => onToggleAccountActive(a.id, !a.isActive))}
                          disabled={busy}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 ${
                            a.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {activeKey === `acc-${a.id}` && <Loader2 className="w-3 h-3 animate-spin" />}
                          {a.isActive ? 'Đang hoạt động' : 'Đã khoá'}
                        </button>
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.role === 'driver' && (
                            editingPinId === a.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={editingPinValue}
                                  onChange={(e) => { setEditingPinValue(e.target.value.replace(/\D/g, '').slice(0, 4)); setEditingPinError(''); }}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSavePin(a.id)}
                                  inputMode="numeric"
                                  placeholder="4 số"
                                  className={`border rounded-lg px-2 py-1 text-xs font-mono tracking-widest w-16 focus:outline-none focus:ring-1 ${
                                    editingPinError ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-emerald-500'
                                  }`}
                                />
                                <button
                                  onClick={() => handleSavePin(a.id)}
                                  disabled={busy}
                                  className="text-emerald-600 cursor-pointer disabled:opacity-40"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setEditingPinId(null); setEditingPinValue(''); setEditingPinError(''); }}
                                  className="text-slate-400 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingPinId(a.id); setEditingPinValue(''); setEditingPinError(''); }}
                                disabled={busy}
                                title="Đổi mã PIN"
                                className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )
                          )}
                          <button
                            onClick={() => {
                              if (busy) return;
                              if (confirm(`Xoá tài khoản ${a.fullName}?`)) runAction(`del-acc-${a.id}`, () => onDeleteAccount(a.id));
                            }}
                            disabled={busy}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {activeKey === `del-acc-${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                        {editingPinId === a.id && editingPinError && (
                          <p className="text-[10px] text-red-600 font-semibold mt-1">{editingPinError}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredAccounts.length > USERS_PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                  disabled={safeUserPage === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>
                <span className="text-[11px] text-slate-500 font-bold font-mono">
                  Trang {safeUserPage + 1}/{userTotalPages} ({filteredAccounts.length} người dùng)
                </span>
                <button
                  type="button"
                  onClick={() => setUserPage((p) => Math.min(userTotalPages - 1, p + 1))}
                  disabled={safeUserPage >= userTotalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {showAddUserModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 mb-4">Thêm Người Dùng Mới</h3>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Tài khoản (username) <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newUsername}
                    onChange={(e) => { setNewUsername(e.target.value); if (addUserErrors.username) setAddUserErrors((p) => ({ ...p, username: undefined })); }}
                    placeholder="vd: linh.nt"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      addUserErrors.username ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />
                  {addUserErrors.username && <p className="text-[11px] text-red-600 font-semibold">{addUserErrors.username}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newFullName}
                    onChange={(e) => { setNewFullName(e.target.value); if (addUserErrors.fullName) setAddUserErrors((p) => ({ ...p, fullName: undefined })); }}
                    placeholder="Nguyễn Thị Linh"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      addUserErrors.fullName ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />
                  {addUserErrors.fullName && <p className="text-[11px] text-red-600 font-semibold">{addUserErrors.fullName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Vai trò</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="driver">Tài xế</option>
                    <option value="accountant">Kế toán</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {newRole === 'driver' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Mã PIN (4 số) <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={newPin}
                      onChange={(e) => {
                        setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        if (addUserErrors.pin) setAddUserErrors((p) => ({ ...p, pin: undefined }));
                      }}
                      inputMode="numeric"
                      placeholder="vd: 1234"
                      className={`w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-1 ${
                        addUserErrors.pin ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                    />
                    {addUserErrors.pin && <p className="text-[11px] text-red-600 font-semibold">{addUserErrors.pin}</p>}
                    <p className="text-[11px] text-slate-400">Tài xế dùng mã này để chọn tên + chuyển ca nhanh trên iPad dùng chung, không cần đăng nhập Google.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">SĐT (tuỳ chọn)</label>
                    <input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="09xxxxxxxx"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Email Gmail (tuỳ chọn)</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="ten@gmail.com"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">Email Gmail dùng để đăng nhập thật qua Google - có thể gán sau trong danh sách.</p>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    disabled={busy}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg cursor-pointer"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Thêm Người Dùng</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="grid md:grid-cols-3 gap-4">
            {/* Shipping lines */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <Ship className="w-4 h-4 text-blue-500" />
                <span>Hãng Tàu (Lines)</span>
              </h3>
              <form onSubmit={handleAddLine} className="flex gap-1.5">
                <input
                  value={newLineCode}
                  onChange={(e) => setNewLineCode(e.target.value)}
                  placeholder="Mã (vd: ZIM)"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <input
                  value={newLineName}
                  onChange={(e) => setNewLineName(e.target.value)}
                  placeholder="Tên đầy đủ"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <button type="submit" disabled={busy} className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.lines.map((l) => (
                  <div key={l.code} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <div>
                      <span className="font-bold text-slate-700">{l.code}</span>
                      <span className="text-slate-400 ml-1.5">{l.name}</span>
                    </div>
                    <button
                      onClick={() => runAction(`line-${l.code}`, () => onToggleShippingLine(l.code, !l.is_active))}
                      disabled={busy}
                      className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${l.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {activeKey === `line-${l.code}` ? <Loader2 className="w-4 h-4 animate-spin" /> : l.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Container sizes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <Ruler className="w-4 h-4 text-amber-500" />
                <span>Kích Thước (Size)</span>
              </h3>
              <form onSubmit={handleAddSize} className="flex gap-1.5">
                <input
                  value={newSizeCode}
                  onChange={(e) => setNewSizeCode(e.target.value)}
                  placeholder="Mã (vd: 20HC)"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <input
                  value={newSizeLabel}
                  onChange={(e) => setNewSizeLabel(e.target.value)}
                  placeholder="Nhãn hiển thị"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <button type="submit" disabled={busy} className="p-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.sizes.map((s) => (
                  <div key={s.code} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <span className="font-bold text-slate-700">{s.label}</span>
                    <button
                      onClick={() => runAction(`size-${s.code}`, () => onToggleContainerSize(s.code, !s.is_active))}
                      disabled={busy}
                      className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${s.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {activeKey === `size-${s.code}` ? <Loader2 className="w-4 h-4 animate-spin" /> : s.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Operation types (labels fixed by business process, only enable/disable) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <Calculator className="w-4 h-4 text-purple-500" />
                <span>Loại Tác Nghiệp</span>
              </h3>
              <form onSubmit={handleAddOperationType} className="flex gap-1.5">
                <input
                  value={newOpCode}
                  onChange={(e) => setNewOpCode(e.target.value)}
                  placeholder="Mã (vd: sua_chua)"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <input
                  value={newOpLabel}
                  onChange={(e) => setNewOpLabel(e.target.value)}
                  placeholder="Tên hiển thị"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <button type="submit" disabled={busy} className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.operations.map((o) => (
                  <div key={o.code} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <span className="font-bold text-slate-700">{o.label}</span>
                    <button
                      onClick={() => runAction(`op-${o.code}`, () => onToggleOperationType(o.code, !o.is_active))}
                      disabled={busy}
                      className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${o.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {activeKey === `op-${o.code}` ? <Loader2 className="w-4 h-4 animate-spin" /> : o.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dao chuyen subtypes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <Repeat className="w-4 h-4 text-orange-500" />
                <span>Phân Loại Đảo Chuyển</span>
              </h3>
              <form onSubmit={handleAddSubtype} className="flex gap-1.5">
                <input
                  value={newSubtypeCode}
                  onChange={(e) => setNewSubtypeCode(e.target.value)}
                  placeholder="Mã (vd: kiem_dinh)"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <input
                  value={newSubtypeLabel}
                  onChange={(e) => setNewSubtypeLabel(e.target.value)}
                  placeholder="Tên hiển thị"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <button type="submit" disabled={busy} className="p-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.daoChuyenSubtypes.map((st) => (
                  <div key={st.code} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <span className="font-bold text-slate-700">{st.label}</span>
                    <button
                      onClick={() => runAction(`subtype-${st.code}`, () => onToggleDaoChuyenSubtype(st.code, !st.is_active))}
                      disabled={busy}
                      className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${st.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {activeKey === `subtype-${st.code}` ? <Loader2 className="w-4 h-4 animate-spin" /> : st.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ghi chú đảo chuyển - danh sách ghi chú cụ thể tài xế chọn khi tác nghiệp Đảo chuyển,
                mỗi ghi chú gắn với 1 Phân Loại Đảo Chuyển ở trên để làm báo cáo. */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <MessageSquareText className="w-4 h-4 text-orange-500" />
                <span>Ghi Chú Đảo Chuyển</span>
              </h3>
              <form onSubmit={handleAddDaoChuyenNote} className="space-y-1.5">
                <input
                  value={newDaoChuyenNoteLabel}
                  onChange={(e) => setNewDaoChuyenNoteLabel(e.target.value)}
                  placeholder="Nội dung ghi chú (vd: Hạ độ cao dọn bãi)"
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <div className="flex gap-1.5">
                  <select
                    value={newDaoChuyenNoteSubtype || configLists.daoChuyenSubtypes[0]?.code || ''}
                    onChange={(e) => setNewDaoChuyenNoteSubtype(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    {configLists.daoChuyenSubtypes.map((st) => (
                      <option key={st.code} value={st.code}>{st.label}</option>
                    ))}
                  </select>
                  <button type="submit" disabled={busy} className="p-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.daoChuyenNotes.map((note) => (
                  <div key={note.code} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <div>
                      <span className="font-bold text-slate-700">{note.label}</span>
                      <span className="block text-[10px] text-slate-400">
                        {configLists.daoChuyenSubtypes.find((st) => st.code === note.subtype_code)?.label ?? note.subtype_code}
                      </span>
                    </div>
                    <button
                      onClick={() => runAction(`dc-note-${note.code}`, () => onToggleDaoChuyenNote(note.code, !note.is_active))}
                      disabled={busy}
                      className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${note.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {activeKey === `dc-note-${note.code}` ? <Loader2 className="w-4 h-4 animate-spin" /> : note.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment types (thiet bi su dung - loai xe tai xe dieu khien) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <Forklift className="w-4 h-4 text-indigo-500" />
                <span>Thiết Bị Sử Dụng</span>
              </h3>
              <form onSubmit={handleAddEquipment} className="flex gap-1.5">
                <input
                  value={newEquipmentCode}
                  onChange={(e) => setNewEquipmentCode(e.target.value)}
                  placeholder="Mã (vd: R39)"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <input
                  value={newEquipmentLabel}
                  onChange={(e) => setNewEquipmentLabel(e.target.value)}
                  placeholder="Tên hiển thị"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <button type="submit" disabled={busy} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.equipmentTypes.map((eq) => (
                  <div key={eq.code} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <span className="font-bold text-slate-700">{eq.label}</span>
                    <button
                      onClick={() => runAction(`equipment-${eq.code}`, () => onToggleEquipmentType(eq.code, !eq.is_active))}
                      disabled={busy}
                      className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${eq.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {activeKey === `equipment-${eq.code}` ? <Loader2 className="w-4 h-4 animate-spin" /> : eq.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Container types (loai container - lanh / kho / ho mai) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <Container className="w-4 h-4 text-sky-500" />
                <span>Loại Container</span>
              </h3>
              <form onSubmit={handleAddContainerType} className="flex gap-1.5">
                <input
                  value={newContainerTypeCode}
                  onChange={(e) => setNewContainerTypeCode(e.target.value)}
                  placeholder="Mã (vd: lanh)"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <input
                  value={newContainerTypeLabel}
                  onChange={(e) => setNewContainerTypeLabel(e.target.value)}
                  placeholder="Tên hiển thị"
                  className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <button type="submit" disabled={busy} className="p-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.containerTypes.map((ct) => (
                  <div key={ct.code} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <span className="font-bold text-slate-700">{ct.label}</span>
                    <button
                      onClick={() => runAction(`container-type-${ct.code}`, () => onToggleContainerType(ct.code, !ct.is_active))}
                      disabled={busy}
                      className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${ct.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                    >
                      {activeKey === `container-type-${ct.code}` ? <Loader2 className="w-4 h-4 animate-spin" /> : ct.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Note presets */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
                <MessageSquareText className="w-4 h-4 text-teal-500" />
                <span>Ghi Chú Gợi Ý</span>
              </h3>
              <form onSubmit={handleAddNote} className="flex gap-1.5">
                <input
                  value={newNoteLabel}
                  onChange={(e) => setNewNoteLabel(e.target.value)}
                  placeholder="Nội dung ghi chú gợi ý"
                  className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                />
                <button type="submit" disabled={busy} className="p-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {configLists.notePresets.map((n) => (
                  <div key={n.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                    <span className="font-bold text-slate-700">{n.label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runAction(`note-${n.id}`, () => onToggleNotePreset(n.id, !n.is_active))}
                        disabled={busy}
                        className={`cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${n.is_active ? 'text-emerald-600' : 'text-slate-300'}`}
                      >
                        {activeKey === `note-${n.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : n.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => runAction(`del-note-${n.id}`, () => onDeleteNotePreset(n.id))}
                        disabled={busy}
                        className="text-red-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {activeKey === `del-note-${n.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
