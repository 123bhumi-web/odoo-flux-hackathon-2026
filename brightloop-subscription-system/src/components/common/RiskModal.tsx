import React, { useState } from 'react';
import { Modal } from './Modal';
import { GravityRiskAssessment } from '../../types/models';
import { GravityService } from '../../services/gravityService';
import {
  AlertTriangle,
  ShieldAlert,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  Copy,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from './Badge';

interface RiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: GravityRiskAssessment | null;
  onDispatched?: () => void;
}

export const RiskModal: React.FC<RiskModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onDispatched,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'whatsapp' | 'sms'>('email');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!assessment) return null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(assessment.recoveryCommunications.messageBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendReminder = async () => {
    setIsSending(true);
    try {
      await GravityService.dispatchRecoveryCommunication({
        ...assessment,
        recoveryCommunications: {
          ...assessment.recoveryCommunications,
          channel: selectedChannel,
        },
      });
      setSentSuccess(true);
      if (onDispatched) onDispatched();
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Failed to dispatch recovery reminder:', err);
    } finally {
      setIsSending(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    if (score >= 25) return '#3b82f6';
    return '#10b981';
  };

  const scoreColor = getScoreColor(assessment.defaultRiskScore);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gravity AI — Overdue Default Risk Assessment"
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Powered by Gravity AI Risk Intelligence Engine
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="bl-btn bl-btn-secondary bl-btn-sm" onClick={onClose}>
              Close
            </button>
            <button
              className="bl-btn bl-btn-primary bl-btn-sm"
              onClick={handleSendReminder}
              disabled={isSending || sentSuccess}
            >
              {sentSuccess ? (
                <>
                  <CheckCircle size={16} /> Dispatched Successfully!
                </>
              ) : isSending ? (
                'Transmitting Notice...'
              ) : (
                <>
                  <Send size={15} /> Send Recovery Reminder
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      {/* Risk Header & Score Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '12px',
          padding: '22px',
          color: '#ffffff',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ maxWidth: '65%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <ShieldAlert size={18} color="#818cf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
              Invoice {assessment.invoiceNumber} • {assessment.customerName}
            </span>
          </div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '4px 0' }}>
            Overdue Risk Level:{' '}
            <span style={{ color: scoreColor, textTransform: 'uppercase' }}>
              {assessment.riskLevel}
            </span>
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
            {assessment.recommendedAction}
          </p>
        </div>

        {/* Circular Gauge / Risk Meter */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.06)',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Default Risk Score
          </span>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {assessment.defaultRiskScore}
            <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/100</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#334155',
              borderRadius: '999px',
              marginTop: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${assessment.defaultRiskScore}%`,
                height: '100%',
                backgroundColor: scoreColor,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Identified Risk Factors */}
      <div style={{ marginBottom: '20px' }}>
        <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
          Identified Risk Indicators & Drivers
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {assessment.riskFactors.map((factor, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#1e293b',
              }}
            >
              <AlertTriangle size={15} color={scoreColor} style={{ flexShrink: 0 }} />
              <span>{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Generated Communications Box */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
            Personalized Payment Recovery Communication
          </h5>

          {/* Channel selector pills */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setSelectedChannel('email')}
              style={{
                border: 'none',
                background: selectedChannel === 'email' ? '#ffffff' : 'transparent',
                boxShadow: selectedChannel === 'email' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: selectedChannel === 'email' ? '#4f46e5' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Mail size={13} /> Email
            </button>
            <button
              onClick={() => setSelectedChannel('whatsapp')}
              style={{
                border: 'none',
                background: selectedChannel === 'whatsapp' ? '#ffffff' : 'transparent',
                boxShadow: selectedChannel === 'whatsapp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: selectedChannel === 'whatsapp' ? '#059669' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <MessageSquare size={13} /> WhatsApp
            </button>
            <button
              onClick={() => setSelectedChannel('sms')}
              style={{
                border: 'none',
                background: selectedChannel === 'sms' ? '#ffffff' : 'transparent',
                boxShadow: selectedChannel === 'sms' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: selectedChannel === 'sms' ? '#d97706' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Smartphone size={13} /> SMS
            </button>
          </div>
        </div>

        {/* Message preview container */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '16px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px',
              marginBottom: '10px',
              fontSize: '0.82rem',
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Subject: </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {assessment.recoveryCommunications.subject}
              </span>
            </div>
            <button
              onClick={handleCopyMessage}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#6366f1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>

          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              color: '#334155',
              lineHeight: '1.6',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            {assessment.recoveryCommunications.messageBody}
          </pre>

          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px dashed #cbd5e1',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Includes Smart Settlement Link (Net Banking, UPI, Cards with 18% GST invoice attached)
            </span>
            <a
              href={assessment.recoveryCommunications.paymentLink}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
              }}
            >
              Test Link <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};
