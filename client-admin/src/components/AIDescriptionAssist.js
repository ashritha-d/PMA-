import React, { useState } from 'react';
import { FiZap, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const AIDescriptionAssist = ({ formData, onApply }) => {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');

  const generate = async () => {
    if (!formData.title || !formData.type) {
      toast.error('Add a title and property type first');
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post('/ai/generate-description', formData);
      setDraft(data.description);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate description');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={generate}
        disabled={loading}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        {loading ? <FiRefreshCw className="spin" /> : <FiZap />} {loading ? 'Generating...' : 'Generate with AI'}
      </button>

      {draft && (
        <div style={{ marginTop: 10, padding: 12, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--gray-700)', marginBottom: 10, whiteSpace: 'pre-wrap' }}>{draft}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { onApply(draft); setDraft(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FiCheck size={13} /> Use This
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={generate} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FiRefreshCw size={13} /> Regenerate
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft('')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FiX size={13} /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDescriptionAssist;
