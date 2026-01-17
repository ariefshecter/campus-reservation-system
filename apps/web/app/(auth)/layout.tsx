import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      {/* Container utama yang membatasi lebar form */}
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}