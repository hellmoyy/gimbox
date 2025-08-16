"use client";
import React from "react";

export default function DeleteButton({ actionUrl, confirmText = "Hapus item ini?" }: { actionUrl: string; confirmText?: string }) {
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!confirm(confirmText)) {
      e.preventDefault();
    }
  };
  return (
    <form action={actionUrl} method="post" className="inline">
      <input type="hidden" name="_method" value="DELETE" />
      <button type="submit" className="text-red-600 hover:underline" onClick={onClick}>Delete</button>
    </form>
  );
}
