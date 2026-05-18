'use client';

import React, { useState } from 'react';
import { RefreshCw, Plus, GitCommit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch('/api/scan', { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="btn" onClick={handleRefresh} disabled={loading}>
      <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
      {loading ? 'Refreshing…' : 'Refresh 刷新'}
    </button>
  );
}

export function QuickActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      await fetch('/api/scan', { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quick-actions">
      <Link href="/settings" className="quick-action" style={{ textDecoration: 'none' }}>
        <Plus size={15} />Add scan directory · 添加扫描目录
      </Link>
      <button className="quick-action" onClick={handleRefreshAll} disabled={loading}>
        <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        {loading ? 'Refreshing…' : 'Refresh all · 刷新全部扫描'}
      </button>
      <Link href="/sync" className="quick-action" style={{ textDecoration: 'none' }}>
        <GitCommit size={15} />Sync everything · 同步全部资产
      </Link>
    </div>
  );
}
