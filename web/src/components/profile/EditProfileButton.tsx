'use client';

import { Edit3, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface EditProfileButtonProps {
  profileId: string;
  initialDisplayName: string;
  initialRoleLabel: string;
  initialLocation: string | null;
}

export function EditProfileButton({
  profileId,
  initialDisplayName,
  initialRoleLabel,
  initialLocation,
}: EditProfileButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [roleLabel, setRoleLabel] = useState(initialRoleLabel);
  const [location, setLocation] = useState(initialLocation ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          role_label: roleLabel,
          location,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? 'Unable to update profile.');
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch {
      setErrorMessage('Unable to update profile right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
      >
        <Edit3 className="mr-2 h-4 w-4" />
        Edit Profile
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-profile-title" className="text-xl font-bold text-slate-950">
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the business identity shown to counterparties.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close edit profile"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Business name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-11 rounded-lg border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Business role
                <input
                  value={roleLabel}
                  onChange={(event) => setRoleLabel(event.target.value)}
                  className="h-11 rounded-lg border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Location
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="h-11 rounded-lg border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  displayName.trim() === '' ||
                  roleLabel.trim() === '' ||
                  location.trim() === ''
                }
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
