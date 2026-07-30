import React, { useState } from 'react';
import {
  Users, Plus, Trash2, Calculator,
  Ship, Ruler, Wrench, Check, X, Loader2,
} from 'lucide-react';
import { Account, ConfigLists } from '../lib/api';
import { UserRole } from '../types';

interface AdminSettingsViewProps {
  accounts: Account[];
  configLists: ConfigLists;
  onCreateAccount: (input: { username: string; fullName: string; role: UserRole; phone?: string; licenseNumber?: string }) => Promise<void>;
  onToggleAccountActive: (id: string, isActive: boolean) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onAddShippingLine: (code: string, name: string) => Promise<void>;
  onToggleShippingLine: (code: string, isActive: boolean) => Promise<void>;
  onAddContainerSize: (code: string, label: string) => Promise<void>;
  onToggleContainerSize: (code: string, isActive: boolean) => Promise<void>;
  onToggleOperationType: (code: string, isActive: boolean) => Promise<void>;
}

const ROLE_LABEL: Record<UserRole, string> = {
  driver: 'Tài xế',
  accountant: 'Kế toán',
  admin: 'Admin',
};

export default function AdminSettingsView({
  accounts,
  configLists,
  onCreateAccount,
  onToggleAccountActive,
  onDeleteAccount,
  onAddShippingLine,
  onToggleShippingLine,
  onAddContainerSize,
  onToggleContainerSize,
  onToggleOperationType,
}: AdminSettingsViewProps) {
  const [tab, setTab] = useState<'users' | 'config'>('users');
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

  // New config item forms
  const [newLineCode, setNewLineCode] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newSizeCode, setNewSizeCode] = useState('');
  const [newSizeLabel, setNewSizeLabel] = useState('');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim()) return;
    setBusy(true);
    try {
      await onCreateAccount({
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        role: newRole,
        phone: newPhone.trim() || undefined,
      });
      setNewUsername('');
      setNewFullName('');
      setNewPhone('');
      setNewRole('driver');
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

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-bold rounded-t-lg cursor-pointer transition-all ${
              tab === 'users' ? 'bg-white border border-b-0 border-slate-200 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Người Dùng</span>
          </button>
          <button
            onClick={() => setTab('config')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-bold rounded-t-lg cursor-pointer transition-all ${
              tab === 'config' ? 'bg-white border border-b-0 border-slate-200 text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Danh Mục (Size / Tác nghiệp / Hãng tàu)</span>
          </button>
        </div>

        {tab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            {/* Add user form */}
            <form onSubmit={handleCreateAccount} className="grid md:grid-cols-5 gap-3 items-end bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tài khoản (username)</label>
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="vd: linh.nt"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Họ và tên</label>
                <input
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nguyễn Thị Linh"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Vai trò</label>
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
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">SĐT (tuỳ chọn)</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Thêm</span>
              </button>
            </form>

            {/* User list */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400 font-bold border-b border-slate-200">
                    <th className="py-2 pr-2">Họ và tên</th>
                    <th className="py-2 pr-2">Tài khoản</th>
                    <th className="py-2 pr-2">Vai trò</th>
                    <th className="py-2 pr-2">SĐT</th>
                    <th className="py-2 pr-2">Trạng thái</th>
                    <th className="py-2 pr-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((a) => (
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <p className="text-[10px] text-slate-400 italic">Danh sách tác nghiệp cố định theo quy trình cảng, chỉ có thể bật/tắt.</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
